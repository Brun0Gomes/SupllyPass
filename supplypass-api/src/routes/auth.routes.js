const express = require('express');
const jwt = require('jsonwebtoken');

const config = require('../config');
const db = require('../db');
const logs = require('../services/logs');
const { verifyPassword } = require('../services/crypto');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const findUser = db.prepare('SELECT * FROM users WHERE email = ?');

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  }

  const user = findUser.get(String(email).trim().toLowerCase());

  // Mesma resposta para usuario inexistente e senha errada:
  // nao entregamos a informacao de quais e-mails existem na base.
  if (!user || !verifyPassword(password, user.password_hash, user.password_salt)) {
    logs.record({
      kind: 'acesso',
      actor: String(email),
      action: 'Tentativa de login rejeitada',
      target: 'API',
      ip: req.ip,
    });
    return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
  }

  const token = jwt.sign(
    {
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      supplierId: user.supplier_id,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  logs.record({
    kind: 'acesso',
    actor: user.company ? `${user.name} · ${user.company}` : user.name,
    action: 'Login autorizado',
    target: `Perfil ${user.role}`,
    ip: req.ip,
  });

  return res.json({
    token,
    expiresIn: config.jwtExpiresIn,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      supplierId: user.supplier_id,
    },
  });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
