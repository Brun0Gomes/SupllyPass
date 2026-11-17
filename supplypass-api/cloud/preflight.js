// Diagnóstico somente leitura: não cria tabelas, nem envia dados ou arquivos.
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { Client } = require('pg');

async function main() {
  const databaseUrl = process.env.SUPABASE_DATABASE_URL;
  if (!databaseUrl) throw new Error('Defina SUPABASE_DATABASE_URL no ambiente local; não compartilhe essa variável.');
  const dbPath = path.resolve(process.env.DB_FILE || path.join(__dirname, '..', 'data', 'supplypass.db'));
  if (!fs.existsSync(dbPath)) throw new Error('Banco SQLite não encontrado.');
  const sqlite = new Database(dbPath, { readonly: true, fileMustExist: true });
  const caPath = process.env.SUPABASE_CA_CERT_PATH;
  const ssl = { rejectUnauthorized: true };
  if (caPath) ssl.ca = fs.readFileSync(path.resolve(caPath), 'utf8');
  const parsedUrl = new URL(databaseUrl);
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
    if (parsedUrl.searchParams.has(key)) {
      throw new Error('Remova os parâmetros SSL da URL e configure a CA pelo ambiente.');
    }
  }
  const postgres = new Client({ connectionString: databaseUrl, ssl });
  const tables = ['suppliers', 'users', 'documents', 'audit_logs', 'sessions'];
  try {
    const source = {};
    for (const table of tables) source[table] = sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
    const files = sqlite.prepare('SELECT COUNT(*) AS count FROM documents WHERE stored_name IS NOT NULL').get().count;
    await postgres.connect();
    const destination = {};
    for (const table of tables) {
      const exists = await postgres.query('SELECT to_regclass($1) AS table_name', [`supplypass_private.${table}`]);
      destination[table] = exists.rows[0].table_name
        ? Number((await postgres.query(`SELECT COUNT(*) AS count FROM supplypass_private.${table}`)).rows[0].count)
        : null;
    }
    console.log(JSON.stringify({ source, sourceStoredFiles: files, destination, note: 'Somente leitura. null significa tabela ausente; nenhum dado foi migrado.' }, null, 2));
  } finally {
    sqlite.close();
    await postgres.end().catch(() => {});
  }
}

main().catch(() => {
  // A mensagem original do driver pode conter URL ou dados de conexão.
  console.error('Não foi possível executar o diagnóstico. Verifique o banco local, a URL, o TLS e as permissões sem compartilhar credenciais.');
  process.exitCode = 1;
});
