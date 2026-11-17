const express = require('express');
const { newId, hashPassword } = require('../src/services/crypto');
const { isRole, publicUser } = require('../src/services/users');
const { DOC_TYPE_MAP } = require('../src/services/score');
const { verifyQrSignature } = require('../src/services/qr');
const { wrap } = require('./auth');

function createRoutes({ pool, passports, auth, audit, limiter }) {
  const router = express.Router();
  const { authenticate, requireRole, actorOf } = auth;
  const staff = [authenticate, requireRole('gestor', 'analista', 'administrador'), limiter('user', 600)];
  const admin = [authenticate, requireRole('administrador'), limiter('user', 600)];

  router.get('/suppliers', ...staff, wrap(async (req, res) => res.json({ suppliers: await passports.list(req.query.full === '1') })));
  router.post('/suppliers', ...staff, requireRole('gestor', 'administrador'), wrap(async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const cnpj = String(req.body?.cnpj || '').replace(/\D/g, '');
    const category = String(req.body?.category || '').trim();
    const city = String(req.body?.city || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!name || name.length > 150 || !category || category.length > 100 || cnpj.length !== 14 || city.length > 150 || email.length > 254 || (email && !/^\S+@\S+\.\S+$/.test(email))) {
      return res.status(400).json({ error: 'Informe nome, categoria, CNPJ com 14 dígitos e dados válidos.' });
    }
    const formatted = cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    const id = newId('for');
    try {
      await pool.query(`INSERT INTO supplypass_private.suppliers (id,name,cnpj,category,city,email,since,qr_token,created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id, name, formatted, category, city, email, String(new Date().getFullYear()), newId('spq'), new Date().toISOString()]);
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Já existe um fornecedor com esse CNPJ.' });
      throw error;
    }
    await audit({ kind: 'acesso', actor: actorOf(req), action: 'Fornecedor cadastrado', target: `${name} · ${id}`, ip: req.ip });
    return res.status(201).json({ supplier: await passports.get(id) });
  }));
  router.get('/suppliers/:id', ...staff, wrap(async (req, res) => {
    const supplier = await passports.get(req.params.id);
    if (!supplier) return res.status(404).json({ error: 'Fornecedor não encontrado.' });
    await audit({ kind: 'verificacao', actor: actorOf(req), action: 'Consulta de passaporte completo', target: supplier.name, ip: req.ip });
    return res.json({ supplier });
  }));
  router.post('/suppliers/:id/check', ...staff, wrap(async (req, res) => {
    const supplier = await passports.get(req.params.id);
    if (!supplier) return res.status(404).json({ error: 'Fornecedor não encontrado.' });
    await audit({ kind: 'verificacao', actor: actorOf(req), action: 'Consulta manual de passaporte', target: supplier.name, ip: req.ip });
    return res.json({ supplier, verifiedAt: new Date().toISOString() });
  }));
  router.get('/suppliers/:id/history/:type', ...staff, wrap(async (req, res) => {
    const { id, type } = req.params;
    if (!DOC_TYPE_MAP[type]) return res.status(400).json({ error: 'Tipo de documento inválido.' });
    if (!await passports.get(id)) return res.status(404).json({ error: 'Fornecedor não encontrado.' });
    const result = await pool.query('SELECT * FROM supplypass_private.documents WHERE supplier_id=$1 AND type=$2 ORDER BY uploaded_at DESC', [id, type]);
    return res.json({ supplierId: id, type, label: DOC_TYPE_MAP[type].label, versions: result.rows.map((row) => ({
      id: row.id, fileName: row.file_name, sha256: row.sha256, issuedAt: row.issued_at, expiresAt: row.expires_at,
      uploadedAt: row.uploaded_at, supersededAt: row.superseded_at, reviewStatus: row.review_status,
      reviewNote: row.review_note, reviewedBy: row.reviewed_by, reviewedAt: row.reviewed_at, current: row.superseded_at === null,
    })) });
  }));

  router.get('/users', ...admin, wrap(async (req, res) => {
    const users = await pool.query('SELECT * FROM supplypass_private.users ORDER BY active DESC, name');
    return res.json({ users: users.rows.map(publicUser) });
  }));
  async function parseUser(body, creating) {
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const role = String(body?.role || '').trim();
    const company = String(body?.company || '').trim() || null;
    const supplierId = role === 'fornecedor' ? String(body?.supplierId || '').trim() : null;
    if ((creating && (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 10)) || !isRole(role)) return { error: 'Informe nome, e-mail, senha e perfil válidos.' };
    if (role === 'fornecedor') {
      const supplier = supplierId && await pool.query('SELECT id FROM supplypass_private.suppliers WHERE id=$1 AND active=1', [supplierId]);
      if (!supplier || !supplier.rowCount) return { error: 'Selecione um fornecedor ativo.' };
    }
    return { name, email, password, role, company, supplierId };
  }
  router.post('/users', ...admin, wrap(async (req, res) => {
    const input = await parseUser(req.body, true);
    if (input.error) return res.status(400).json({ error: input.error });
    const { hash, salt } = hashPassword(input.password);
    let result;
    try {
      result = await pool.query(`INSERT INTO supplypass_private.users (id,name,email,password_hash,password_salt,role,company,supplier_id,created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [newId('usr'), input.name, input.email, hash, salt, input.role, input.company, input.supplierId, new Date().toISOString()]);
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Já existe um usuário com este e-mail.' });
      throw error;
    }
    await audit({ kind: 'acesso', actor: actorOf(req), action: 'Usuário criado', target: `${input.name} · ${input.role}`, ip: req.ip });
    return res.status(201).json({ user: publicUser(result.rows[0]) });
  }));
  router.patch('/users/:id', ...admin, wrap(async (req, res) => {
    const result = await pool.query('SELECT * FROM supplypass_private.users WHERE id=$1', [req.params.id]);
    const current = result.rows[0];
    if (!current) return res.status(404).json({ error: 'Usuário não encontrado.' });
    const input = await parseUser({ role: req.body?.role ?? current.role, company: req.body?.company ?? current.company, supplierId: req.body?.supplierId ?? current.supplier_id }, false);
    if (input.error) return res.status(400).json({ error: input.error });
    if (req.body?.active !== undefined && typeof req.body.active !== 'boolean') return res.status(400).json({ error: 'Situação inválida.' });
    const active = req.body?.active === undefined ? current.active : Number(req.body.active);
    if (current.id === req.user.id && (!active || input.role !== current.role)) return res.status(400).json({ error: 'Você não pode desativar ou alterar seu próprio perfil.' });
    const updated = await pool.query('UPDATE supplypass_private.users SET role=$1, company=$2, supplier_id=$3, active=$4 WHERE id=$5 RETURNING *', [input.role, input.company, input.supplierId, active, current.id]);
    await audit({ kind: 'acesso', actor: actorOf(req), action: active ? 'Permissões de usuário atualizadas' : 'Usuário desativado', target: `${current.name} · ${input.role}`, ip: req.ip });
    return res.json({ user: publicUser(updated.rows[0]) });
  }));

  async function verify(req, res) {
    const raw = String(req.body?.code || req.params.code || '').trim().toUpperCase();
    const match = /^SUPPLYPASS:(SPQ_[A-F0-9]{16})\.([A-F0-9]{16})$/.exec(raw);
    let supplier = null;
    if (match && verifyQrSignature(match[1].toLowerCase(), match[2])) {
      const result = await pool.query('SELECT id FROM supplypass_private.suppliers WHERE qr_token=$1 AND qr_active=1 AND active=1', [match[1].toLowerCase()]);
      if (result.rowCount) supplier = await passports.get(result.rows[0].id);
    }
    if (!supplier) {
      await audit({ kind: 'verificacao', actor: actorOf(req), action: 'Leitura de QR Code não reconhecido', ip: req.ip });
      return res.status(404).json({ error: 'Este QR Code não pertence a um passaporte válido.' });
    }
    await audit({ kind: 'verificacao', actor: actorOf(req), action: 'Consulta de passaporte via QR Code', target: supplier.name, ip: req.ip });
    return res.json({ verifiedAt: new Date().toISOString(), supplier: {
      id: supplier.id, name: supplier.name, cnpj: supplier.cnpj, category: supplier.category, score: supplier.score,
      status: supplier.status, counts: supplier.counts, alerts: supplier.passport.filter((item) => item.status !== 'valido').map(({ label, required, status, daysLeft }) => ({ label, required, status, daysLeft })),
    } });
  }
  const verifyAccess = [authenticate, requireRole('administrador', 'gestor', 'analista', 'verificador'), limiter('user', 600)];
  router.post('/verify', ...verifyAccess, wrap(verify));
  router.get('/verify/:code', ...verifyAccess, wrap(verify));
  router.get('/logs', authenticate, requireRole('gestor', 'administrador'), limiter('user', 600), wrap(async (req, res) => {
    const requested = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 500) : 100;
    const result = await pool.query('SELECT id,kind,actor,action,target,at FROM supplypass_private.audit_logs ORDER BY at DESC LIMIT $1', [limit]);
    return res.json({ logs: result.rows });
  }));
  return router;
}
module.exports = { createRoutes };
