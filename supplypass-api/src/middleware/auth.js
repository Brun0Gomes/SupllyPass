const jwt = require('jsonwebtoken');

const config = require('../config');
const db = require('../db');

const findActiveUser = db.prepare(`
  SELECT id, name, email, role, company, supplier_id
  FROM users
  WHERE id = ? AND active = 1
`);

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

  // Sempre recarrega o usuário: desativações e alterações de papel passam a
  // valer imediatamente, mesmo que o JWT ainda não tenha expirado.
  const user = findActiveUser.get(payload.sub);
  if (!user) {
    return res.status(401).json({ error: 'Sessão inválida ou conta desativada.' });
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company,
    supplierId: user.supplier_id || null,
  };
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

module.exports = { authenticate, requireRole, actorOf };
