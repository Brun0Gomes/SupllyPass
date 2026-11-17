// Relatório local somente de leitura. Não define uma política nem exclui dados.
const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const dbPath = path.resolve(process.env.DB_FILE || path.join(__dirname, '..', 'data', 'supplypass.db'));
if (!fs.existsSync(dbPath)) throw new Error('Banco não encontrado. Informe DB_FILE ou inicialize a API.');
const db = new Database(dbPath, { readonly: true, fileMustExist: true });
try {
  const tables = ['users', 'suppliers', 'documents', 'sessions', 'audit_logs'];
  const counts = Object.fromEntries(tables.map((table) => [table, db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count]));
  const dates = db.prepare(`SELECT MIN(at) AS oldest, MAX(at) AS newest FROM audit_logs`).get();
  const versions = db.prepare('SELECT COUNT(*) AS count FROM documents WHERE superseded_at IS NOT NULL').get().count;
  console.log(JSON.stringify({ counts, supersededDocumentVersions: versions, auditLogDates: dates }, null, 2));
} finally {
  db.close();
}
