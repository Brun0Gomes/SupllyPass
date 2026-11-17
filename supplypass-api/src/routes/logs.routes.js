const express = require('express');

const logs = require('../services/logs');
const { authenticate, requireRole } = require('../middleware/auth');
const { authenticatedLimiter } = require('../middleware/rate-limit');

const router = express.Router();

router.get('/', authenticate, requireRole('gestor', 'administrador'), authenticatedLimiter, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  res.json({ logs: logs.list(limit) });
});

module.exports = router;
