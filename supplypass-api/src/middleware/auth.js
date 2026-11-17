const jwt = require('jsonwebtoken');

const config = require('../config');
const db = require('../db');
const { newId } = require('../services/crypto');

const findActiveSession = db.prepare(`
  SELECT
    sessions.id AS session_id, sessions.last_seen_at, sessions.expires_at,
    users.id, users.name, users.email, users.role, users.company, users.supplier_id
  FROM sessions
  JOIN users ON users.id = sessions.user_id
  WHERE sessions.id = ? AND sessions.revoked_at IS NULL AND users.active = 1
`);
const touchSession = db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?');
const revokeSession = db.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL');
const insertSession = db.prepare(`
  INSERT INTO sessions (id, user_id, created_at, last_seen_at, expires_at, revoked_at)
  VALUES (@id, @user_id, @created_at, @last_seen_at, @expires_at, NULL)
`);

function sessionUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company,
    supplierId: user.supplier_id || null,
  };
}

function createSession(user) {
  const now = new Date();
  const sessionId = newId('ses');
  const expiresAt = new Date(now.getTime() + config.sessionMaxHours * 60 * 60 * 1000).toISOString();
  insertSession.run({
    id: sessionId,
    user_id: user.id,
    created_at: now.toISOString(),
    last_seen_at: now.toISOString(),
    expires_at: expiresAt,
  });
  const token = jwt.sign({ sub: user.id, sid: sessionId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  return { token, expiresIn: config.jwtExpiresIn, user: sessionUser(user) };
}

// Le o token do cabecalho "Authorization: Bearer <token>", valida a assinatura
// e coloca os dados do usuario em req.user. Sem token valido, ninguem passa.
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token ausente. Faça login para continuar.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch (error) {
    const expired = error.name === 'TokenExpiredError';
    return res.status(401).json({
      error: expired ? 'Sessão expirada. Faça login novamente.' : 'Token inválido.',
    });
  }

  if (!payload.sid) {
    return res.status(401).json({ error: 'Sessão antiga inválida. Faça login novamente.' });
  }

  // A sessão e o usuário são recarregados a cada requisição: desativações,
  // alterações de papel e expiração por inatividade passam a valer na hora.
  const session = findActiveSession.get(payload.sid);
  if (!session || session.id !== payload.sub) {
    return res.status(401).json({ error: 'Sessão inválida ou conta desativada.' });
  }

  const now = Date.now();
  const idleAt = new Date(session.last_seen_at).getTime() + config.sessionIdleMinutes * 60 * 1000;
  const expiresAt = new Date(session.expires_at).getTime();
  if (now >= idleAt || now >= expiresAt) {
    revokeSession.run(new Date().toISOString(), session.session_id);
    return res.status(401).json({ error: 'Sessão encerrada por inatividade. Faça login novamente.' });
  }
  touchSession.run(new Date().toISOString(), session.session_id);

  req.user = sessionUser(session);
  req.sessionId = session.session_id;
  return next();
}

// Controle de acesso por papel: cada rota declara quem pode entrar.
function requireRole(...roles) {
  return function check(req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Seu perfil não tem acesso a este recurso.' });
    }
    return next();
  };
}

// Identificacao curta do autor para a trilha de auditoria.
function actorOf(req) {
  if (!req.user) return 'anônimo';
  return req.user.company ? `${req.user.name} · ${req.user.company}` : req.user.name;
}

module.exports = { authenticate, requireRole, actorOf, createSession, sessionUser };
