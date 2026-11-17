const express = require('express');
const jwt = require('jsonwebtoken');

const config = require('../config');
const db = require('../db');
const logs = require('../services/logs');
const { verifyPassword } = require('../services/crypto');
const { generateSecret, verifyCode, otpauthUrl } = require('../services/totp');
const { authenticate, createSession } = require('../middleware/auth');
const { loginLimiter, authenticatedLimiter } = require('../middleware/rate-limit');

const router = express.Router();
const findUser = db.prepare('SELECT * FROM users WHERE email = ?');
const registerFailedAttempt = db.prepare(`
  UPDATE users
  SET failed_login_attempts = @attempts, locked_until = @locked_until
  WHERE id = @id
`);
const clearFailedAttempts = db.prepare(`
  UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?
`);
const savePendingMfa = db.prepare('UPDATE users SET mfa_pending_secret = ? WHERE id = ?');
const enableMfa = db.prepare(`
  UPDATE users SET mfa_secret = mfa_pending_secret, mfa_pending_secret = NULL, mfa_enabled = 1 WHERE id = ?
`);

const MFA_ROLES = new Set(['administrador', 'gestor']);

function actorOf(user) {
  return user.company ? `${user.name} · ${user.company}` : user.name;
}

function challengeToken(user, purpose) {
  return jwt.sign({ sub: user.id, purpose }, config.jwtSecret, { expiresIn: '10m' });
}

function challengeUser(token, purpose) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch (error) {
    return null;
  }
  if (payload.purpose !== purpose || !payload.sub) return null;
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(payload.sub);
  return user || null;
}

function readMfaToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' ? token : null;
}

router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  }

  const user = findUser.get(String(email).trim().toLowerCase());
  const now = Date.now();
  const lockExpired = Boolean(
    user && user.locked_until && new Date(user.locked_until).getTime() <= now
  );

  if (user && user.active && user.locked_until && new Date(user.locked_until).getTime() > now) {
    logs.record({
      kind: 'acesso', actor: String(email), action: 'Tentativa de login bloqueada temporariamente', target: 'API', ip: req.ip,
    });
    return res.status(429).json({ error: 'Conta temporariamente bloqueada. Tente novamente mais tarde.' });
  }
  if (user && user.active && lockExpired) clearFailedAttempts.run(user.id);

  // Mesma resposta para usuario inexistente e senha errada:
  // nao entregamos a informacao de quais e-mails existem na base.
  if (!user || !user.active || !verifyPassword(password, user.password_hash, user.password_salt)) {
    if (user && user.active) {
      const attempts = (lockExpired ? 0 : Number(user.failed_login_attempts || 0)) + 1;
      const lockedUntil = attempts >= config.loginMaxAttempts
        ? new Date(now + config.loginLockMinutes * 60 * 1000).toISOString()
        : null;
      registerFailedAttempt.run({ id: user.id, attempts, locked_until: lockedUntil });
    }
    logs.record({
      kind: 'acesso',
      actor: String(email),
      action: 'Tentativa de login rejeitada',
      target: 'API',
      ip: req.ip,
    });
    const locked = user && user.active && (lockExpired ? 1 : Number(user.failed_login_attempts || 0) + 1) >= config.loginMaxAttempts;
    return res.status(locked ? 429 : 401).json({
      error: locked ? 'Conta temporariamente bloqueada após tentativas inválidas.' : 'E-mail ou senha inválidos.',
    });
  }

  clearFailedAttempts.run(user.id);

  if (MFA_ROLES.has(user.role)) {
    const enabled = Boolean(user.mfa_enabled && user.mfa_secret);
    const purpose = enabled ? 'mfa-login' : 'mfa-setup';
    return res.json({
      mfaRequired: enabled,
      mfaSetupRequired: !enabled,
      mfaToken: challengeToken(user, purpose),
      email: user.email,
    });
  }

  const session = createSession(user);

  logs.record({
    kind: 'acesso',
    actor: actorOf(user),
    action: 'Login autorizado',
    target: `Perfil ${user.role}`,
    ip: req.ip,
  });

  return res.json(session);
});

router.post('/mfa/setup', (req, res) => {
  const user = challengeUser(readMfaToken(req), 'mfa-setup');
  if (!user) return res.status(401).json({ error: 'Etapa MFA expirada. Entre novamente.' });

  const secret = user.mfa_pending_secret || generateSecret();
  if (!user.mfa_pending_secret) savePendingMfa.run(secret, user.id);
  return res.json({ secret, otpauthUrl: otpauthUrl({ secret, account: user.email, issuer: config.totpIssuer }) });
});

router.post('/mfa/confirm', (req, res) => {
  const user = challengeUser(readMfaToken(req), 'mfa-setup');
  if (!user || !user.mfa_pending_secret) return res.status(401).json({ error: 'Etapa MFA expirada. Entre novamente.' });
  if (!verifyCode(user.mfa_pending_secret, req.body?.code)) {
    return res.status(400).json({ error: 'Código do autenticador inválido.' });
  }
  enableMfa.run(user.id);
  logs.record({ kind: 'acesso', actor: actorOf(user), action: 'MFA TOTP ativado', target: `Perfil ${user.role}`, ip: req.ip });
  return res.json(createSession({ ...user, mfa_enabled: 1 }));
});

router.post('/mfa/verify', (req, res) => {
  const user = challengeUser(readMfaToken(req), 'mfa-login');
  if (!user || !user.mfa_enabled || !user.mfa_secret) {
    return res.status(401).json({ error: 'Etapa MFA expirada. Entre novamente.' });
  }
  if (!verifyCode(user.mfa_secret, req.body?.code)) {
    logs.record({ kind: 'acesso', actor: actorOf(user), action: 'Código MFA rejeitado', target: 'API', ip: req.ip });
    return res.status(401).json({ error: 'Código do autenticador inválido.' });
  }
  const session = createSession(user);
  logs.record({ kind: 'acesso', actor: actorOf(user), action: 'Login autorizado com MFA', target: `Perfil ${user.role}`, ip: req.ip });
  return res.json(session);
});

router.post('/logout', authenticate, authenticatedLimiter, (req, res) => {
  db.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL')
    .run(new Date().toISOString(), req.sessionId);
  logs.record({ kind: 'acesso', actor: actorOf(req.user), action: 'Logout autorizado', target: 'API', ip: req.ip });
  return res.status(204).end();
});

router.get('/me', authenticate, authenticatedLimiter, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
