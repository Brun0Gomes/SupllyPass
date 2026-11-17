const express = require('express');
const jwt = require('jsonwebtoken');
const { newId, verifyPassword } = require('../src/services/crypto');
const { generateSecret, verifyCode, otpauthUrl } = require('../src/services/totp');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const publicUser = (row) => ({ id: row.id, name: row.name, email: row.email, role: row.role, company: row.company, supplierId: row.supplier_id || null });

function createAuth({ pool, config, audit, limiter }) {
  const router = express.Router();
  const actorOf = (req) => req.user.company ? `${req.user.name} · ${req.user.company}` : req.user.name;

  async function createSession(user) {
    const now = new Date();
    const id = newId('ses');
    await pool.query(`INSERT INTO supplypass_private.sessions (id, user_id, created_at, last_seen_at, expires_at)
      VALUES ($1, $2, $3, $3, $4)`, [id, user.id, now.toISOString(), new Date(now.getTime() + config.sessionMaxHours * 3600000).toISOString()]);
    return { token: jwt.sign({ sub: user.id, sid: id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn }), expiresIn: config.jwtExpiresIn, user: publicUser(user) };
  }

  const authenticate = wrap(async (req, res, next) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    let claims;
    try { if (scheme !== 'Bearer' || !token) throw new Error(); claims = jwt.verify(token, config.jwtSecret); }
    catch (_) { return res.status(401).json({ error: 'Sessão inválida ou expirada.' }); }
    if (!claims.sid || !claims.sub) return res.status(401).json({ error: 'Sessão inválida.' });
    const now = new Date();
    const idleThreshold = new Date(now.getTime() - config.sessionIdleMinutes * 60000).toISOString();
    // Uma atualização condicional atômica evita reativar sessão vencida.
    const result = await pool.query(`UPDATE supplypass_private.sessions AS s SET last_seen_at = $1
      FROM supplypass_private.users AS u WHERE s.id = $2 AND s.user_id = $3 AND u.id = s.user_id
      AND u.active = 1 AND s.revoked_at IS NULL AND s.expires_at > $1 AND s.last_seen_at > $4
      RETURNING u.id, u.name, u.email, u.role, u.company, u.supplier_id`, [now.toISOString(), claims.sid, claims.sub, idleThreshold]);
    if (!result.rowCount) return res.status(401).json({ error: 'Sessão inválida, inativa ou expirada.' });
    req.user = publicUser(result.rows[0]);
    req.sessionId = claims.sid;
    return next();
  });

  const requireRole = (...roles) => (req, res, next) => roles.includes(req.user.role)
    ? next() : res.status(403).json({ error: 'Seu perfil não tem acesso a este recurso.' });

  function readChallenge(req, purpose) {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    try {
      const claims = jwt.verify(token, config.jwtSecret);
      return scheme === 'Bearer' && claims.purpose === purpose && claims.sub ? claims.sub : null;
    } catch (_) { return null; }
  }

  router.post('/login', limiter('login', 20), wrap(async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password;
    if (!email || typeof password !== 'string' || password.length > 1024) return res.status(400).json({ error: 'Informe e-mail e senha.' });
    const result = await pool.query('SELECT * FROM supplypass_private.users WHERE email = $1', [email]);
    const user = result.rows[0];
    const now = Date.now();
    const lockTime = user?.locked_until ? Date.parse(user.locked_until) : 0;
    if (user?.active && lockTime > now) return res.status(429).json({ error: 'Conta temporariamente bloqueada.' });
    if (!user || !user.active || !verifyPassword(password, user.password_hash, user.password_salt)) {
      if (user?.active) {
        const attempts = (lockTime && lockTime <= now ? 0 : Number(user.failed_login_attempts || 0)) + 1;
        const until = attempts >= config.loginMaxAttempts ? new Date(now + config.loginLockMinutes * 60000).toISOString() : null;
        await pool.query('UPDATE supplypass_private.users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3', [attempts, until, user.id]);
      }
      await audit({ kind: 'acesso', actor: email, action: 'Tentativa de login rejeitada', target: 'API', ip: req.ip });
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }
    await pool.query('UPDATE supplypass_private.users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1', [user.id]);
    if (user.role === 'administrador') {
      const enabled = Boolean(user.mfa_enabled && user.mfa_secret);
      const purpose = enabled ? 'mfa-login' : 'mfa-setup';
      return res.json({ mfaRequired: enabled, mfaSetupRequired: !enabled, mfaToken: jwt.sign({ sub: user.id, purpose }, config.jwtSecret, { expiresIn: '10m' }), email: user.email });
    }
    const session = await createSession(user);
    await audit({ kind: 'acesso', actor: user.name, action: 'Login autorizado', target: user.role, ip: req.ip });
    return res.json(session);
  }));

  async function challengeUser(req, purpose) {
    const id = readChallenge(req, purpose);
    if (!id) return null;
    const result = await pool.query('SELECT * FROM supplypass_private.users WHERE id = $1 AND active = 1 AND role = $2', [id, 'administrador']);
    return result.rows[0] || null;
  }

  router.post('/mfa/setup', limiter('mfa', 20), wrap(async (req, res) => {
    const user = await challengeUser(req, 'mfa-setup');
    if (!user || user.mfa_enabled) return res.status(401).json({ error: 'Etapa MFA expirada. Entre novamente.' });
    const secret = user.mfa_pending_secret || generateSecret();
    if (!user.mfa_pending_secret) await pool.query('UPDATE supplypass_private.users SET mfa_pending_secret = $1 WHERE id = $2 AND mfa_enabled = 0', [secret, user.id]);
    return res.json({ secret, otpauthUrl: otpauthUrl({ secret, account: user.email, issuer: config.totpIssuer }) });
  }));
  router.post('/mfa/confirm', limiter('mfa', 20), wrap(async (req, res) => {
    const user = await challengeUser(req, 'mfa-setup');
    if (!user || user.mfa_enabled || !user.mfa_pending_secret || !verifyCode(user.mfa_pending_secret, req.body?.code)) {
      return res.status(401).json({ error: 'Código inválido ou etapa expirada.' });
    }
    const updated = await pool.query(`UPDATE supplypass_private.users SET mfa_secret = mfa_pending_secret, mfa_pending_secret = NULL, mfa_enabled = 1
      WHERE id = $1 AND mfa_enabled = 0 AND mfa_pending_secret = $2 RETURNING id`, [user.id, user.mfa_pending_secret]);
    if (!updated.rowCount) return res.status(409).json({ error: 'Configuração alterada. Entre novamente.' });
    await audit({ kind: 'acesso', actor: user.name, action: 'MFA TOTP ativado', target: user.role, ip: req.ip });
    return res.json(await createSession(user));
  }));
  router.post('/mfa/verify', limiter('mfa', 20), wrap(async (req, res) => {
    const user = await challengeUser(req, 'mfa-login');
    if (!user || !user.mfa_enabled || !user.mfa_secret || !verifyCode(user.mfa_secret, req.body?.code)) {
      return res.status(401).json({ error: 'Código inválido ou etapa expirada.' });
    }
    await audit({ kind: 'acesso', actor: user.name, action: 'Login autorizado com MFA', target: user.role, ip: req.ip });
    return res.json(await createSession(user));
  }));
  router.post('/logout', authenticate, wrap(async (req, res) => {
    await pool.query('UPDATE supplypass_private.sessions SET revoked_at = $1 WHERE id = $2 AND revoked_at IS NULL', [new Date().toISOString(), req.sessionId]);
    await audit({ kind: 'acesso', actor: actorOf(req), action: 'Logout autorizado', target: 'API', ip: req.ip });
    return res.status(204).end();
  }));
  router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));
  return { router, authenticate, requireRole, actorOf };
}

module.exports = { createAuth, wrap };
