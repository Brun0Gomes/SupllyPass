const express = require('express');
const multer = require('multer');
const { wrap } = require('./auth');
const { DOC_TYPE_MAP } = require('../src/services/score');
const { sha256, encryptBuffer, decryptBuffer, newId } = require('../src/services/crypto');
const { detectAllowedFile } = require('../src/services/file-validation');
const { formatQrCode } = require('../src/services/qr');

function normalizeDate(value) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text ? text : null;
}

function createDocumentRoutes({ pool, config, storage, store, passports, auth, audit, limiter }) {
  const router = express.Router();
  const { authenticate, requireRole, actorOf } = auth;
  const owner = [authenticate, requireRole('fornecedor'), limiter('user', 600)];
  const analyst = [authenticate, requireRole('analista'), limiter('user', 600)];
  // Vercel Functions limitam o corpo da requisição. 3 MiB deixa espaço para multipart.
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: Math.min(config.maxUploadBytes, 3 * 1024 * 1024), files: 1, fields: 5 } });

  router.get('/me/passport', ...owner, wrap(async (req, res) => {
    const supplier = await passports.get(req.user.supplierId, true);
    if (!supplier) return res.status(404).json({ error: 'Fornecedor não encontrado.' });
    return res.json({ supplier });
  }));
  router.post('/me/qr/rotate', ...owner, wrap(async (req, res) => {
    const token = newId('spq');
    const result = await pool.query('UPDATE supplypass_private.suppliers SET qr_token=$1, qr_active=1 WHERE id=$2 AND active=1', [token, req.user.supplierId]);
    if (!result.rowCount) return res.status(404).json({ error: 'Fornecedor não encontrado.' });
    await audit({ kind: 'acesso', actor: actorOf(req), action: 'QR Code revogado e renovado', target: req.user.supplierId, ip: req.ip });
    return res.json({ qrToken: token, qrCode: formatQrCode(token) });
  }));
  router.post('/me/documents', ...owner, upload.single('file'), wrap(async (req, res) => {
    const { type } = req.body || {};
    const expiresAt = normalizeDate(req.body?.expiresAt);
    const issuedAt = req.body?.issuedAt ? normalizeDate(req.body.issuedAt) : new Date().toISOString().slice(0, 10);
    if (!req.file || !DOC_TYPE_MAP[type] || !expiresAt || !issuedAt) return res.status(400).json({ error: 'Informe arquivo, tipo e datas válidos.' });
    const detected = detectAllowedFile(req.file.buffer);
    if (!detected || detected.mimeType !== req.file.mimetype) return res.status(400).json({ error: 'O conteúdo não corresponde a PDF, PNG ou JPG.' });
    if (!await passports.get(req.user.supplierId, true)) return res.status(404).json({ error: 'Fornecedor não encontrado.' });
    const id = newId('doc');
    const storedName = `${id}.enc`;
    const digest = sha256(req.file.buffer);
    const { encrypted, iv, authTag } = encryptBuffer(req.file.buffer, config.fileKey);
    const document = { id, supplier_id: req.user.supplierId, type, file_name: String(req.file.originalname || 'documento').slice(0, 200),
      stored_name: storedName, mime_type: detected.mimeType, size_bytes: req.file.size, sha256: digest,
      iv, auth_tag: authTag, issued_at: issuedAt, expires_at: expiresAt, uploaded_by: req.user.id, uploaded_at: new Date().toISOString() };
    await storage.assertPrivate();
    await storage.put(storedName, encrypted);
    try { await store.replaceDocument(document); }
    catch (error) {
      // Em falha no banco, tenta evitar arquivo órfão. A falha de limpeza deve
      // ser investigada sem esconder o erro que interrompeu o cadastro.
      try { await storage.remove(storedName); } catch (_) { console.error('Não foi possível limpar objeto órfão:', id); }
      throw error;
    }
    await audit({ kind: 'upload', actor: actorOf(req), action: `Envio de documento para análise (${DOC_TYPE_MAP[type].label})`, target: id, ip: req.ip });
    return res.status(201).json({ document: { id, type, fileName: document.file_name, sha256: digest, sizeBytes: document.size_bytes,
      issuedAt, expiresAt, encryption: 'AES-256-GCM', reviewStatus: 'pending' }, supplier: await passports.get(req.user.supplierId, true) });
  }));

  async function sendFile(req, res, ownerOnly) {
    const result = await pool.query('SELECT * FROM supplypass_private.documents WHERE id=$1 AND superseded_at IS NULL', [req.params.id]);
    const document = result.rows[0];
    if (!document || !document.stored_name || (ownerOnly && document.supplier_id !== req.user.supplierId)) return res.status(404).json({ error: 'Arquivo não disponível.' });
    await storage.assertPrivate();
    const ciphertext = await storage.get(document.stored_name);
    if (!ciphertext) return res.status(404).json({ error: 'Arquivo não disponível.' });
    let plain;
    try {
      plain = decryptBuffer(ciphertext, config.fileKey, document.iv, document.auth_tag);
      if (sha256(plain) !== document.sha256) throw new Error('Hash inválido');
    } catch (_) {
      await audit({ kind: 'acesso', actor: actorOf(req), action: 'Falha de integridade documental', target: document.id, ip: req.ip });
      return res.status(409).json({ error: 'Não foi possível verificar a integridade do arquivo.' });
    }
    await audit({ kind: 'acesso', actor: actorOf(req), action: ownerOnly ? 'Download de documento próprio' : 'Arquivo aberto para análise', target: document.id, ip: req.ip });
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment');
    return res.send(plain);
  }
  router.get('/me/documents/:id/download', ...owner, wrap((req, res) => sendFile(req, res, true)));
  router.get('/reviews/:id/download', ...analyst, wrap((req, res) => sendFile(req, res, false)));
  router.get('/reviews', ...analyst, wrap(async (req, res) => {
    const status = String(req.query.status || 'pending');
    if (!['pending', 'approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Status de revisão inválido.' });
    const result = await pool.query(`SELECT d.*, s.name AS supplier_name, s.cnpj AS supplier_cnpj, u.name AS reviewer_name
      FROM supplypass_private.documents d JOIN supplypass_private.suppliers s ON s.id=d.supplier_id
      LEFT JOIN supplypass_private.users u ON u.id=d.reviewed_by
      WHERE d.superseded_at IS NULL AND d.review_status=$1 ORDER BY d.uploaded_at ASC`, [status]);
    return res.json({ reviews: result.rows.map(passports.review) });
  }));
  router.get('/reviews/:id', ...analyst, wrap(async (req, res) => {
    const review = await passports.getReview(req.params.id);
    if (!review) return res.status(404).json({ error: 'Documento não encontrado.' });
    return res.json({ review });
  }));
  router.post('/reviews/:id/decision', ...analyst, wrap(async (req, res) => {
    const decision = String(req.body?.decision || '').trim().toLowerCase();
    const note = String(req.body?.note || '').trim();
    if (!['approved', 'rejected'].includes(decision) || note.length > 500 || (decision === 'rejected' && note.length < 5)) {
      return res.status(400).json({ error: 'Informe uma decisão válida e o motivo da reprovação.' });
    }
    const update = await pool.query(`UPDATE supplypass_private.documents SET review_status=$1, review_note=$2, reviewed_by=$3, reviewed_at=$4
      WHERE id=$5 AND superseded_at IS NULL AND review_status='pending' RETURNING supplier_id`,
    [decision, note || null, req.user.id, new Date().toISOString(), req.params.id]);
    if (!update.rowCount) return res.status(409).json({ error: 'Documento não encontrado, já analisado ou substituído.' });
    const review = await passports.getReview(req.params.id);
    await audit({ kind: 'analise', actor: actorOf(req), action: decision === 'approved' ? 'Documento aprovado na análise' : 'Documento reprovado na análise', target: review.id, ip: req.ip });
    return res.json({ review, supplier: await passports.get(update.rows[0].supplier_id) });
  }));
  return router;
}
module.exports = { createDocumentRoutes };
