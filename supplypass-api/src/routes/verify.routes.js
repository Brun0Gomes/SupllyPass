const express = require('express');

const suppliers = require('../services/suppliers');
const logs = require('../services/logs');
const { authenticate, actorOf } = require('../middleware/auth');

const router = express.Router();

// Aceita "SUPPLYPASS:FOR-1042" (conteudo do QR Code) ou apenas "FOR-1042".
function parseCode(raw) {
  if (!raw) return null;
  const text = String(raw).trim().toUpperCase();
  if (text.startsWith('SUPPLYPASS:')) return text.replace('SUPPLYPASS:', '');
  if (/^FOR-\d{3,}$/.test(text)) return text;
  return null;
}

function verifyHandler(req, res) {
  const raw = (req.body && req.body.code) || req.params.code;
  const id = parseCode(raw);
  const passport = id ? suppliers.getPassport(id) : null;

  if (!passport) {
    logs.record({
      kind: 'verificacao',
      actor: actorOf(req),
      action: 'Leitura de QR Code não reconhecido',
      target: String(raw || ''),
      ip: req.ip,
    });
    return res.status(404).json({ error: 'Este QR Code não pertence a um passaporte válido.' });
  }

  logs.record({
    kind: 'verificacao',
    actor: actorOf(req),
    action: 'Consulta de passaporte via QR Code',
    target: passport.name,
    ip: req.ip,
  });

  // A verificacao devolve SOMENTE status. Nenhum nome de arquivo, nenhum hash,
  // nenhum caminho de download: quem escaneia nao acessa os documentos.
  return res.json({
    verifiedAt: new Date().toISOString(),
    supplier: {
      id: passport.id,
      name: passport.name,
      cnpj: passport.cnpj,
      category: passport.category,
      score: passport.score,
      status: passport.status,
      counts: passport.counts,
      alerts: passport.passport
        .filter((item) => item.status !== 'valido')
        .map((item) => ({
          label: item.label,
          required: item.required,
          status: item.status,
          daysLeft: item.daysLeft,
        })),
    },
  });
}

router.use(authenticate);
router.post('/', verifyHandler);
router.get('/:code', verifyHandler);

module.exports = router;
