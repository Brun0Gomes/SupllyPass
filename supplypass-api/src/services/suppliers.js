const db = require('../db');
const { summarize, DOC_TYPE_MAP } = require('./score');
const { formatQrCode } = require('./qr');

const selectSuppliers = db.prepare('SELECT * FROM suppliers WHERE active = 1 ORDER BY name');
const selectSupplier = db.prepare('SELECT * FROM suppliers WHERE id = ?');
const selectSupplierByQr = db.prepare(
  'SELECT * FROM suppliers WHERE qr_token = ? AND qr_active = 1 AND active = 1'
);

// "Documento atual" e o que ainda nao foi substituido (superseded_at IS NULL).
// As versoes antigas continuam na tabela, formando o historico.
const selectCurrentDocs = db.prepare(`
  SELECT * FROM documents
  WHERE supplier_id = ? AND superseded_at IS NULL
`);

const selectHistory = db.prepare(`
  SELECT * FROM documents
  WHERE supplier_id = ? AND type = ?
  ORDER BY uploaded_at DESC
`);

const selectReviewsByStatus = db.prepare(`
  SELECT
    d.*, s.name AS supplier_name, s.cnpj AS supplier_cnpj,
    reviewer.name AS reviewer_name
  FROM documents d
  JOIN suppliers s ON s.id = d.supplier_id
  LEFT JOIN users reviewer ON reviewer.id = d.reviewed_by
  WHERE d.superseded_at IS NULL AND d.review_status = ?
  ORDER BY d.uploaded_at ASC
`);

const selectReviewById = db.prepare(`
  SELECT
    d.*, s.name AS supplier_name, s.cnpj AS supplier_cnpj,
    reviewer.name AS reviewer_name
  FROM documents d
  JOIN suppliers s ON s.id = d.supplier_id
  LEFT JOIN users reviewer ON reviewer.id = d.reviewed_by
  WHERE d.id = ?
`);

const REVIEW_STATUSES = ['pending', 'approved', 'rejected'];

function reviewFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    supplierCnpj: row.supplier_cnpj,
    type: row.type,
    label: DOC_TYPE_MAP[row.type]?.label || row.type,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    sha256: row.sha256,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    uploadedAt: row.uploaded_at,
    reviewStatus: row.review_status || 'approved',
    reviewNote: row.review_note || null,
    reviewedBy: row.reviewer_name || null,
    reviewedAt: row.reviewed_at || null,
    current: row.superseded_at === null,
  };
}

function getSupplier(id) {
  return selectSupplier.get(id) || null;
}

function currentDocuments(supplierId) {
  return selectCurrentDocs.all(supplierId);
}

function getPassport(supplierId) {
  const supplier = getSupplier(supplierId);
  if (!supplier) return null;
  return summarize(supplier, currentDocuments(supplierId));
}

function getPassportByQrToken(token) {
  const supplier = selectSupplierByQr.get(token);
  if (!supplier) return null;
  return summarize(supplier, currentDocuments(supplier.id));
}

function getOwnerPassport(supplierId) {
  const supplier = getSupplier(supplierId);
  if (!supplier || !supplier.active) return null;
  return {
    ...summarize(supplier, currentDocuments(supplierId)),
    qrToken: supplier.qr_token,
    qrCode: formatQrCode(supplier.qr_token),
    qrActive: Boolean(supplier.qr_active),
  };
}

// Lista resumida por padrao (sem o detalhe de cada documento).
// Com { full: true } devolve tambem o passaporte completo de cada fornecedor.
function listWithSummary({ full = false } = {}) {
  return selectSuppliers.all().map((supplier) => {
    const summary = summarize(supplier, currentDocuments(supplier.id));
    if (full) return summary;
    const { passport, ...rest } = summary;
    return rest;
  });
}

function documentHistory(supplierId, type) {
  return selectHistory.all(supplierId, type).map((row) => ({
    id: row.id,
    fileName: row.file_name,
    sha256: row.sha256,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    uploadedAt: row.uploaded_at,
    supersededAt: row.superseded_at,
    reviewStatus: row.review_status || 'approved',
    reviewNote: row.review_note || null,
    reviewedBy: row.reviewed_by || null,
    reviewedAt: row.reviewed_at || null,
    current: row.superseded_at === null,
  }));
}

function listReviews(status = 'pending') {
  if (!REVIEW_STATUSES.includes(status)) return [];
  return selectReviewsByStatus.all(status).map(reviewFromRow);
}

function getReview(id) {
  return reviewFromRow(selectReviewById.get(id));
}

module.exports = {
  getSupplier,
  currentDocuments,
  getPassport,
  getPassportByQrToken,
  getOwnerPassport,
  listWithSummary,
  documentHistory,
  listReviews,
  getReview,
  REVIEW_STATUSES,
};
