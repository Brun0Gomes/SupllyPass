const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const multer = require('multer');

const config = require('../config');
const db = require('../db');
const logs = require('../services/logs');
const suppliersService = require('../services/suppliers');
const { DOC_TYPE_MAP } = require('../services/score');
const { sha256, encryptBuffer, decryptBuffer, newId } = require('../services/crypto');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// O arquivo chega na memoria: criptografamos ANTES de escrever no disco,
// entao em nenhum momento existe uma copia legivel no servidor.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes },
  fileFilter(req, file, cb) {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Formato não aceito. Envie PDF, PNG ou JPG.'));
    }
    return cb(null, true);
  },
});

const supersede = db.prepare(`
  UPDATE documents SET superseded_at = ?
  WHERE supplier_id = ? AND type = ? AND superseded_at IS NULL
`);

const insertDocument = db.prepare(`
  INSERT INTO documents (
    id, supplier_id, type, file_name, stored_name, mime_type, size_bytes,
    sha256, iv, auth_tag, issued_at, expires_at, uploaded_by, uploaded_at, superseded_at
  ) VALUES (
    @id, @supplier_id, @type, @file_name, @stored_name, @mime_type, @size_bytes,
    @sha256, @iv, @auth_tag, @issued_at, @expires_at, @uploaded_by, @uploaded_at, NULL
  )
`);

const selectDocument = db.prepare('SELECT * FROM documents WHERE id = ?');

// Substituir a versao anterior e inserir a nova precisa ser atomico:
// ou as duas coisas acontecem, ou nenhuma.
const replaceDocument = db.transaction((document) => {
  supersede.run(document.uploaded_at, document.supplier_id, document.type);
  insertDocument.run(document);
});

function normalizeDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : text;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return iso;
}

router.use(authenticate, requireRole('fornecedor'));

// Passaporte do proprio fornecedor logado.
router.get('/passport', (req, res) => {
  const passport = suppliersService.getPassport(req.user.supplierId);
  if (!passport) return res.status(404).json({ error: 'Fornecedor não encontrado.' });
  res.json({ supplier: passport });
});

router.post('/documents', upload.single('file'), (req, res) => {
  const supplierId = req.user.supplierId;
  const { type } = req.body;
  const expiresAt = normalizeDate(req.body.expiresAt);
  const issuedAt = normalizeDate(req.body.issuedAt) || new Date().toISOString().slice(0, 10);

  if (!req.file) return res.status(400).json({ error: 'Envie o arquivo no campo "file".' });
  if (!DOC_TYPE_MAP[type]) return res.status(400).json({ error: 'Tipo de documento inválido.' });
  if (!expiresAt) return res.status(400).json({ error: 'Informe a validade (AAAA-MM-DD).' });

  // 1. Hash do arquivo ORIGINAL: e ele que prova a integridade depois.
  const digest = sha256(req.file.buffer);

  // 2. Criptografia em repouso com AES-256-GCM.
  const { encrypted, iv, authTag } = encryptBuffer(req.file.buffer, config.fileKey);

  // 3. Grava apenas o conteudo cifrado no disco.
  const id = newId('doc');
  const storedName = `${id}.enc`;
  fs.writeFileSync(path.join(config.storageDir, storedName), encrypted);

  const document = {
    id,
    supplier_id: supplierId,
    type,
    file_name: req.file.originalname,
    stored_name: storedName,
    mime_type: req.file.mimetype,
    size_bytes: req.file.size,
    sha256: digest,
    iv,
    auth_tag: authTag,
    issued_at: issuedAt,
    expires_at: expiresAt,
    uploaded_by: req.user.id,
    uploaded_at: new Date().toISOString(),
  };

  replaceDocument(document);

  logs.record({
    kind: 'upload',
    actor: req.user.company || req.user.name,
    action: `Envio de documento (${DOC_TYPE_MAP[type].label})`,
    target: `${req.file.originalname} · sha256 ${digest.slice(0, 12)}…`,
    ip: req.ip,
  });

  res.status(201).json({
    document: {
      id,
      type,
      fileName: document.file_name,
      sha256: digest,
      sizeBytes: document.size_bytes,
      issuedAt,
      expiresAt,
      encryption: 'AES-256-GCM',
    },
    supplier: suppliersService.getPassport(supplierId),
  });
});

// Download do proprio arquivo: le do disco, decifra e CONFERE o hash.
// Se o conteudo tiver sido adulterado, o download e recusado.
router.get('/documents/:id/download', (req, res) => {
  const document = selectDocument.get(req.params.id);

  if (!document || document.supplier_id !== req.user.supplierId) {
    return res.status(404).json({ error: 'Documento não encontrado.' });
  }
  if (!document.stored_name) {
    return res.status(404).json({ error: 'Este registro não possui arquivo armazenado.' });
  }

  const filePath = path.join(config.storageDir, document.stored_name);
  if (!fs.existsSync(filePath)) {
    return res.status(410).json({ error: 'Arquivo indisponível no armazenamento.' });
  }

  let plain;
  try {
    plain = decryptBuffer(fs.readFileSync(filePath), config.fileKey, document.iv, document.auth_tag);
  } catch (error) {
    return res.status(409).json({ error: 'Falha na decifragem: arquivo possivelmente adulterado.' });
  }

  if (sha256(plain) !== document.sha256) {
    logs.record({
      kind: 'acesso',
      actor: req.user.company || req.user.name,
      action: 'ALERTA: divergência de hash na leitura de documento',
      target: document.file_name,
      ip: req.ip,
    });
    return res.status(409).json({ error: 'Integridade comprometida: o hash não confere.' });
  }

  logs.record({
    kind: 'acesso',
    actor: req.user.company || req.user.name,
    action: 'Download de documento próprio',
    target: document.file_name,
    ip: req.ip,
  });

  res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${document.file_name}"`);
  return res.send(plain);
});

module.exports = router;
