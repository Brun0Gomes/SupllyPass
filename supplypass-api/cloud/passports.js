const { summarize, DOC_TYPE_MAP } = require('../src/services/score');
const { formatQrCode } = require('../src/services/qr');

function createPassports(pool) {
  async function get(id, owner = false) {
    const result = await pool.query('SELECT * FROM supplypass_private.suppliers WHERE id = $1 AND active = 1', [id]);
    const supplier = result.rows[0];
    if (!supplier) return null;
    const docs = await pool.query('SELECT * FROM supplypass_private.documents WHERE supplier_id = $1 AND superseded_at IS NULL', [id]);
    const summary = summarize(supplier, docs.rows);
    return owner ? { ...summary, qrToken: supplier.qr_token, qrCode: formatQrCode(supplier.qr_token), qrActive: Boolean(supplier.qr_active) } : summary;
  }
  async function list(full) {
    const result = await pool.query('SELECT * FROM supplypass_private.suppliers WHERE active = 1 ORDER BY name');
    const docs = await pool.query('SELECT * FROM supplypass_private.documents WHERE superseded_at IS NULL');
    return result.rows.map((supplier) => {
      const summary = summarize(supplier, docs.rows.filter((doc) => doc.supplier_id === supplier.id));
      if (full) return summary;
      const { passport, ...rest } = summary;
      return rest;
    });
  }
  function review(row) {
    if (!row) return null;
    return {
      id: row.id, supplierId: row.supplier_id, supplierName: row.supplier_name, supplierCnpj: row.supplier_cnpj,
      type: row.type, label: DOC_TYPE_MAP[row.type]?.label || row.type, fileName: row.file_name,
      mimeType: row.mime_type, sizeBytes: row.size_bytes, sha256: row.sha256, issuedAt: row.issued_at,
      expiresAt: row.expires_at, uploadedAt: row.uploaded_at, reviewStatus: row.review_status,
      reviewNote: row.review_note, reviewedBy: row.reviewer_name, reviewedAt: row.reviewed_at,
      current: row.superseded_at === null,
    };
  }
  async function getReview(id) {
    const result = await pool.query(`SELECT d.*, s.name AS supplier_name, s.cnpj AS supplier_cnpj, u.name AS reviewer_name
      FROM supplypass_private.documents d JOIN supplypass_private.suppliers s ON s.id = d.supplier_id
      LEFT JOIN supplypass_private.users u ON u.id = d.reviewed_by WHERE d.id = $1`, [id]);
    return review(result.rows[0]);
  }
  return { get, list, review, getReview };
}
module.exports = { createPassports };
