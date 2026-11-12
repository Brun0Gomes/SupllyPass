const express = require('express');

const suppliers = require('../services/suppliers');
const logs = require('../services/logs');
const { DOC_TYPE_MAP } = require('../services/score');
const { authenticate, requireRole, actorOf } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas abaixo exigem login e perfil de contratante ou admin.
router.use(authenticate, requireRole('contratante', 'admin'));

// ?full=1 traz tambem o detalhe dos 7 documentos de cada fornecedor.
// O app usa essa versao para montar o painel com uma unica requisicao.
router.get('/', (req, res) => {
  const full = req.query.full === '1';
  res.json({ suppliers: suppliers.listWithSummary({ full }) });
});

router.get('/:id', (req, res) => {
  const passport = suppliers.getPassport(req.params.id);
  if (!passport) return res.status(404).json({ error: 'Fornecedor não encontrado.' });

  logs.record({
    kind: 'verificacao',
    actor: actorOf(req),
    action: 'Consulta de passaporte completo',
    target: passport.name,
    ip: req.ip,
  });

  return res.json({ supplier: passport });
});

// Historico de versoes de um documento: o que foi substituido continua registrado.
router.get('/:id/history/:type', (req, res) => {
  const { id, type } = req.params;
  if (!DOC_TYPE_MAP[type]) return res.status(400).json({ error: 'Tipo de documento inválido.' });
  if (!suppliers.getSupplier(id)) return res.status(404).json({ error: 'Fornecedor não encontrado.' });

  res.json({
    supplierId: id,
    type,
    label: DOC_TYPE_MAP[type].label,
    versions: suppliers.documentHistory(id, type),
  });
});

module.exports = router;
