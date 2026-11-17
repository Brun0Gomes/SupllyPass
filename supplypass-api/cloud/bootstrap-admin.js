// Cria o primeiro administrador somente quando não existe nenhum usuário.
require('dotenv').config();
const fs = require('node:fs');
const { createPool } = require('./database');
const { hashPassword, newId } = require('../src/services/crypto');

async function main() {
  const name = String(process.env.BOOTSTRAP_ADMIN_NAME || '').trim();
  const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '');
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 10) throw new Error('CONFIGURACAO_ADMIN_INVALIDA');
  const ca = process.env.SUPABASE_DB_CA_CERT || (process.env.SUPABASE_CA_CERT_PATH && fs.readFileSync(process.env.SUPABASE_CA_CERT_PATH, 'utf8'));
  if (!ca) throw new Error('CERTIFICADO_AUSENTE');
  const pool = createPool({ connectionString: process.env.SUPABASE_DATABASE_URL, caCertificate: ca });
  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');
    await connection.query('SELECT pg_advisory_xact_lock($1)', [758634221]);
    const count = await connection.query('SELECT COUNT(*)::int AS n FROM supplypass_private.users');
    if (count.rows[0].n !== 0) throw new Error('USUARIOS_JA_EXISTEM');
    const { hash, salt } = hashPassword(password);
    await connection.query(`INSERT INTO supplypass_private.users (id,name,email,password_hash,password_salt,role,created_at)
      VALUES ($1,$2,$3,$4,$5,'administrador',$6)`, [newId('usr'), name, email, hash, salt, new Date().toISOString()]);
    await connection.query('COMMIT');
    console.log('Administrador inicial criado. Ele deverá configurar MFA no primeiro acesso.');
  } catch (error) {
    await connection.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}
main().catch((error) => {
  const safe = ['CONFIGURACAO_ADMIN_INVALIDA', 'CERTIFICADO_AUSENTE', 'USUARIOS_JA_EXISTEM'];
  console.error('Falha ao criar administrador:', safe.includes(error.message) ? error.message : error.code || 'ERRO');
  process.exitCode = 1;
});
