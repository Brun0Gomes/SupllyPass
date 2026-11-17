const express = require('express');

const db = require('../db');
const logs = require('../services/logs');
const suppliers = require('../services/suppliers');
const { authenticate, requireRole, actorOf } = require('../middleware/auth');

const router = express.Router();

const updateDecision = db.prepare(`
  UPDATE documents
  SET review_status = @review_status,
      review_note = @review_note,
      reviewed_by = @reviewed_by,
      reviewed_at = @reviewed_at
  WHERE id = @id AND superseded_at IS NULL AND review_status = 'pending'
`);

router.use(authenticate, requireRole('analista'));

// A fila contém somente a versão vigente de cada documento. Uma versão nova
// substitui a anterior e recebe uma nova análise, sem apagar o histórico.
router.get('/', (req, res) => {
  const status = String(req.query.status || 'pending').toLowerCase();
  if (!suppliers.REVIEW_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status de revisão inválido.' });
  }
  return res.json({ reviews: suppliers.listReviews(status) });
});

router.get('/:id', (req, res) => {
  const review = suppliers.getReview(req.params.id);
  if (!review) return res.status(404).json({ error: 'Documento não encontrado.' });
  return res.json({ review });
});

router.post('/:id/decision', (req, res) => {
  const decision = String(req.body?.decision || '').trim().toLowerCase();
  const note = String(req.body?.note || '').trim();

  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'A decisão deve ser approved ou rejected.' });
  }
  if (note.length > 500) {
    return res.status(400).json({ error: 'A justificativa pode ter no máximo 500 caracteres.' });
  }
  if (decision === 'rejected' && note.length < 5) {
    return res.status(400).json({ error: 'Informe o motivo da reprovação (mínimo de 5 caracteres).' });
  }

  const pendingReview = suppliers.getReview(req.params.id);
  if (!pendingReview) return res.status(404).json({ error: 'Documento não encontrado.' });
  if (pendingReview.reviewStatus !== 'pending' || !pendingReview.current) {
    return res.status(409).json({ error: 'Este documento já recebeu uma decisão ou foi substituído.' });
  }

  const reviewedAt = new Date().toISOString();
  const result = updateDecision.run({
    id: pendingReview.id,
    review_status: decision,
    review_note: note || null,
    reviewed_by: req.user.id,
    reviewed_at: reviewedAt,
  });
  if (result.changes !== 1) {
    return res.status(409).json({ error: 'O documento mudou antes da decisão. Atualize a fila.' });
  }

  const action = decision === 'approved' ? 'Documento aprovado na análise' : 'Documento reprovado na análise';
  logs.record({
    kind: 'analise',
    actor: actorOf(req),
    action,
    target: `${pendingReview.supplierName} · ${pendingReview.label}${note ? ` · ${note}` : ''}`,
    ip: req.ip,
  });

  return res.json({
    review: suppliers.getReview(pendingReview.id),
    supplier: suppliers.getPassport(pendingReview.supplierId),
  });
});

module.exports = router;
