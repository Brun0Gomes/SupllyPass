// Cria o esquema somente se ele ainda não existir; não importa dados.
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

async function main() {
  const databaseUrl = process.env.SUPABASE_DATABASE_URL;
  const caPath = process.env.SUPABASE_CA_CERT_PATH;
  if (!databaseUrl || !caPath) throw new Error('CONFIGURACAO_INCOMPLETA');
  const parsed = new URL(databaseUrl);
  if (['sslmode', 'sslcert', 'sslkey', 'sslrootcert'].some((key) => parsed.searchParams.has(key))) {
    throw new Error('PARAMETROS_SSL_NAO_PERMITIDOS');
  }
  const client = new Client({ connectionString: databaseUrl, ssl: { ca: fs.readFileSync(path.resolve(caPath), 'utf8'), rejectUnauthorized: true } });
  try {
    await client.connect();
    const existing = await client.query("SELECT to_regnamespace('supplypass_private') AS name");
    if (existing.rows[0].name) throw new Error('ESQUEMA_JA_EXISTE');
    await client.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
    console.log('Esquema privado criado. Nenhum dado foi importado.');
  } finally {
    await client.end().catch(() => {});
  }
}
main().catch((error) => {
  const allowed = ['CONFIGURACAO_INCOMPLETA', 'PARAMETROS_SSL_NAO_PERMITIDOS', 'ESQUEMA_JA_EXISTE'];
  console.error('Não foi possível criar o esquema:', allowed.includes(error.message) ? error.message : error.code || 'ERRO');
  process.exitCode = 1;
});
