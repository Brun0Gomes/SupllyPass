const express = require('express');

const suppliers = require('../services/suppliers');
const logs = require('../services/logs');
const { DOC_TYPE_MAP } = require('../services/score');
const { authenticate, requireRole, actorOf } = require('../middleware/auth');
const { authenticatedLimiter } = require('../middleware/rate-limit');
const db = require('../db');
const { newId } = require('../services/crypto');

const router = express.Router();

// Gestor, analista e administrador podem consultar os passaportes.
router.use(authenticate, requireRole('gestor', 'analista', 'administrador'), authenticatedLimiter);

// ?full=1 traz tambem o detalhe dos 7 documentos de cada fornecedor.
// O app usa essa versao para montar o painel com uma unica requisicao.
router.get('/', (req, res) => {
  const full = req.query.full === '1';
  res.json({ suppliers: suppliers.listWithSummary({ full }) });
});

router.post('/', requireRole('gestor', 'administrador'), (req, res) => {
  const name = String(req.body?.name || '').trim();
  const cnpj = String(req.body?.cnpj || '').replace(/\D/g, '');
  const category = String(req.body?.category || '').trim();
  const city = String(req.body?.city || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!name || name.length > 150 || !category || category.length > 100 || cnpj.length !== 14 ||
      city.length > 150 || email.length > 254 || (email && !/^\S+@\S+\.\S+$/.test(email))) {
    return res.status(400).json({ error: 'Informe nome, categoria, CNPJ com 14 dígitos e dados de contato válidos.' });
  }
  const formattedCnpj = cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (db.prepare('SELECT 1 FROM suppliers WHERE cnpj = ? OR cnpj = ?').get(cnpj, formattedCnpj)) {
    return res.status(409).json({ error: 'Já existe um fornecedor com esse CNPJ.' });
  }
  const id = newId('for');
  db.prepare(`INSERT INTO suppliers (id, name, cnpj, category, city, email, since, active, qr_token, qr_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 1, ?)`).run(
    id, name, formattedCnpj, category, city, email, String(new Date().getFullYear()), newId('spq'), new Date().toISOString()
  );
  logs.record({ kind: 'acesso', actor: actorOf(req), action: 'Fornecedor cadastrado', target: `${name} · ${id}`, ip: req.ip });
  return res.status(201).json({ supplier: suppliers.getPassport(id) });
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

// Consulta manual no passaporte completo: não depende do token de QR Code,
// mas mantém a mesma rastreabilidade da leitura feita pela câmera.
router.post('/:id/check', (req, res) => {
  const passport = suppliers.getPassport(req.params.id);
  if (!passport) return res.status(404).json({ error: 'Fornecedor não encontrado.' });

  logs.record({
    kind: 'verificacao',
    actor: actorOf(req),
    action: 'Consulta manual de passaporte',
    target: passport.name,
    ip: req.ip,
  });
  return res.json({ supplier: passport, verifiedAt: new Date().toISOString() });
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
