const express = require('express');

const db = require('../db');
const logs = require('../services/logs');
const { hashPassword, newId } = require('../services/crypto');
const { isRole, publicUser } = require('../services/users');
const { authenticate, requireRole, actorOf } = require('../middleware/auth');
const { authenticatedLimiter } = require('../middleware/rate-limit');

const router = express.Router();

const listUsers = db.prepare('SELECT * FROM users ORDER BY active DESC, name COLLATE NOCASE');
const findUser = db.prepare('SELECT * FROM users WHERE id = ?');
const findByEmail = db.prepare('SELECT id FROM users WHERE email = ?');
const findSupplier = db.prepare('SELECT id FROM suppliers WHERE id = ? AND active = 1');
const insertUser = db.prepare(`
  INSERT INTO users (
    id, name, email, password_hash, password_salt, role, company, supplier_id, active, created_at
  ) VALUES (
    @id, @name, @email, @password_hash, @password_salt, @role, @company, @supplier_id, 1, @created_at
  )
`);
const updateUser = db.prepare(`
  UPDATE users
  SET role = @role, company = @company, supplier_id = @supplier_id, active = @active
  WHERE id = @id
`);

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function userInput(body, { creating = false } = {}) {
  const name = String(body?.name || '').trim();
  const email = normalizeEmail(body?.email);
  const role = String(body?.role || '').trim();
  const company = String(body?.company || '').trim();
  const selectedSupplierId = body?.supplierId ? String(body.supplierId).trim() : null;
  const password = String(body?.password || '');

  if (creating && (!name || !email || !password)) {
    return { error: 'Informe nome, e-mail e senha para criar o usuário.' };
  }
  if (creating && !/^\S+@\S+\.\S+$/.test(email)) {
    return { error: 'Informe um e-mail válido.' };
  }
  if (creating && password.length < 10) {
    return { error: 'A senha inicial precisa ter pelo menos 10 caracteres.' };
  }
  if (!isRole(role)) return { error: 'Perfil de usuário inválido.' };
  const supplierId = role === 'fornecedor' ? selectedSupplierId : null;
  if (role === 'fornecedor' && !supplierId) {
    return { error: 'Usuários fornecedores precisam estar associados a um fornecedor.' };
  }
  if (supplierId && !findSupplier.get(supplierId)) {
    return { error: 'Fornecedor informado não existe ou está inativo.' };
  }

  return { value: { name, email, password, role, company: company || null, supplierId } };
}

router.use(authenticate, requireRole('administrador'), authenticatedLimiter);

router.get('/', (req, res) => {
  res.json({ users: listUsers.all().map(publicUser) });
});

router.post('/', (req, res) => {
  const parsed = userInput(req.body, { creating: true });
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const { name, email, password, role, company, supplierId } = parsed.value;

  if (findByEmail.get(email)) {
    return res.status(409).json({ error: 'Já existe um usuário com este e-mail.' });
  }

  const { hash, salt } = hashPassword(password);
  const user = {
    id: newId('usr'),
    name,
    email,
    password_hash: hash,
    password_salt: salt,
    role,
    company,
    supplier_id: supplierId,
    created_at: new Date().toISOString(),
  };
  insertUser.run(user);

  logs.record({
    kind: 'acesso',
    actor: actorOf(req),
    action: 'Usuário criado',
    target: `${name} · ${role}`,
    ip: req.ip,
  });
  return res.status(201).json({ user: publicUser({ ...user, active: 1 }) });
});

router.patch('/:id', (req, res) => {
  const current = findUser.get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const body = {
    ...current,
    ...req.body,
    role: req.body?.role ?? current.role,
    company: req.body?.company ?? current.company,
    supplierId: req.body?.supplierId ?? current.supplier_id,
  };
  const parsed = userInput(body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const { role, company, supplierId } = parsed.value;
  const active = req.body?.active === undefined ? Number(current.active) : req.body.active ? 1 : 0;

  if (current.id === req.user.id && !active) {
    return res.status(400).json({ error: 'Você não pode desativar a própria conta.' });
  }
  if (current.id === req.user.id && role !== current.role) {
    return res.status(400).json({ error: 'Você não pode alterar o próprio perfil.' });
  }

  updateUser.run({ id: current.id, role, company, supplier_id: supplierId, active });
  const updated = findUser.get(current.id);
  logs.record({
    kind: 'acesso',
    actor: actorOf(req),
    action: active ? 'Permissões de usuário atualizadas' : 'Usuário desativado',
    target: `${updated.name} · ${updated.role}`,
    ip: req.ip,
  });
  return res.json({ user: publicUser(updated) });
});

module.exports = router;
