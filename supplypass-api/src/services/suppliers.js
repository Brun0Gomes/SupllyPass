const db = require('../db');
const { summarize } = require('./score');

const selectSuppliers = db.prepare('SELECT * FROM suppliers WHERE active = 1 ORDER BY name');
const selectSupplier = db.prepare('SELECT * FROM suppliers WHERE id = ?');

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
    current: row.superseded_at === null,
  }));
}

module.exports = {
  getSupplier,
  currentDocuments,
  getPassport,
  listWithSummary,
  documentHistory,
};
