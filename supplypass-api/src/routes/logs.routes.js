const express = require('express');

const logs = require('../services/logs');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, requireRole('contratante', 'admin'), (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  res.json({ logs: logs.list(limit) });
});

module.exports = router;
