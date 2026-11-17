// Operações PostgreSQL para a futura API de nuvem. Não substitui a API local.
// Consultas são qualificadas pelo esquema para funcionar com pooler em modo
// transação, sem depender de variáveis de sessão (como search_path).
function createPostgresStore(pool) {
  async function transaction(work) {
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');
      const result = await work(connection);
      await connection.query('COMMIT');
      return result;
    } catch (error) {
      try { await connection.query('ROLLBACK'); } catch (_) { /* preserva o erro original */ }
      throw error;
    } finally {
      connection.release();
    }
  }

  return {
    transaction,
    async getUserByEmail(email) {
      const result = await pool.query('SELECT * FROM supplypass_private.users WHERE email = $1', [email]);
      return result.rows[0] || null;
    },
    async getSupplier(id) {
      const result = await pool.query('SELECT * FROM supplypass_private.suppliers WHERE id = $1', [id]);
      return result.rows[0] || null;
    },
    async getCurrentDocuments(supplierId) {
      const result = await pool.query('SELECT * FROM supplypass_private.documents WHERE supplier_id = $1 AND superseded_at IS NULL', [supplierId]);
      return result.rows;
    },
    async replaceDocument(document) {
      return transaction(async (connection) => {
        // Impede concorrência entre dois envios para o mesmo fornecedor.
        const supplier = await connection.query('SELECT id FROM supplypass_private.suppliers WHERE id = $1 AND active = 1 FOR UPDATE', [document.supplier_id]);
        if (!supplier.rowCount) throw new Error('Fornecedor não encontrado ou inativo.');
        await connection.query('UPDATE supplypass_private.documents SET superseded_at = $1 WHERE supplier_id = $2 AND type = $3 AND superseded_at IS NULL', [document.uploaded_at, document.supplier_id, document.type]);
        const values = [document.id, document.supplier_id, document.type, document.file_name, document.stored_name,
          document.mime_type, document.size_bytes, document.sha256, document.iv, document.auth_tag,
          document.issued_at, document.expires_at, document.uploaded_by, document.uploaded_at];
        await connection.query(`INSERT INTO supplypass_private.documents
          (id, supplier_id, type, file_name, stored_name, mime_type, size_bytes, sha256, iv, auth_tag,
           issued_at, expires_at, uploaded_by, uploaded_at, review_status)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending')`, values);
      });
    },
  };
}

module.exports = { createPostgresStore };
