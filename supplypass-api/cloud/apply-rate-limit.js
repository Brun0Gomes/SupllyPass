// Migração aditiva para contadores compartilhados; não altera tabelas existentes.
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { createPool } = require('./database');

async function main() {
  const ca = process.env.SUPABASE_DB_CA_CERT || (process.env.SUPABASE_CA_CERT_PATH && fs.readFileSync(process.env.SUPABASE_CA_CERT_PATH, 'utf8'));
  if (!ca) throw new Error('CERTIFICADO_AUSENTE');
  const pool = createPool({ connectionString: process.env.SUPABASE_DATABASE_URL, caCertificate: ca });
  try {
    const check = await pool.query("SELECT to_regclass('supplypass_private.rate_limits') AS name");
    if (check.rows[0].name) throw new Error('TABELA_JA_EXISTE');
    await pool.query(fs.readFileSync(path.join(__dirname, 'rate-limit.sql'), 'utf8'));
    console.log('Tabela privada de limites criada.');
  } finally {
    await pool.end();
  }
}
main().catch((error) => {
  const safe = ['CERTIFICADO_AUSENTE', 'TABELA_JA_EXISTE'];
  console.error('Falha na migração:', safe.includes(error.message) ? error.message : error.code || 'ERRO');
  process.exitCode = 1;
});
