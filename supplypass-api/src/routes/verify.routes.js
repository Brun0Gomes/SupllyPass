const express = require('express');

const suppliers = require('../services/suppliers');
const logs = require('../services/logs');
const { authenticate, requireRole, actorOf } = require('../middleware/auth');

const router = express.Router();

// Aceita apenas o token aleatório presente no QR Code, nunca o ID do fornecedor.
function parseCode(raw) {
  if (!raw) return null;
  const text = String(raw).trim().toUpperCase();
  const match = /^SUPPLYPASS:(SPQ_[A-F0-9]{16})$/.exec(text);
  if (match) return match[1].toLowerCase();
  return null;
}

function verifyHandler(req, res) {
  const raw = (req.body && req.body.code) || req.params.code;
  const token = parseCode(raw);
  const passport = token ? suppliers.getPassportByQrToken(token) : null;

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

router.use(authenticate, requireRole('administrador', 'gestor', 'analista', 'verificador'));
router.post('/', verifyHandler);
router.get('/:code', verifyHandler);

module.exports = router;
