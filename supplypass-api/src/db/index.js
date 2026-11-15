const Database = require('better-sqlite3');

const config = require('../config');
const { newId } = require('../services/crypto');

const db = new Database(config.dbFile);

// WAL deixa leitura e escrita simultaneas mais rapidas.
db.pragma('journal_mode = WAL');
// Garante que as chaves estrangeiras sejam realmente validadas.
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('administrador', 'gestor', 'analista', 'fornecedor', 'verificador')),
    company       TEXT,
    supplier_id   TEXT REFERENCES suppliers(id),
    active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    cnpj       TEXT NOT NULL UNIQUE,
    category   TEXT NOT NULL,
    city       TEXT,
    email      TEXT,
    since      TEXT,
    active     INTEGER NOT NULL DEFAULT 1,
    qr_token   TEXT UNIQUE,
    qr_active  INTEGER NOT NULL DEFAULT 1 CHECK (qr_active IN (0, 1)),
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id            TEXT PRIMARY KEY,
    supplier_id   TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    type          TEXT NOT NULL,
    file_name     TEXT NOT NULL,
    stored_name   TEXT,
    mime_type     TEXT,
    size_bytes    INTEGER,
    sha256        TEXT NOT NULL,
    iv            TEXT,
    auth_tag      TEXT,
    issued_at     TEXT NOT NULL,
    expires_at    TEXT NOT NULL,
    uploaded_by   TEXT,
    uploaded_at   TEXT NOT NULL,
    superseded_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_documents_current
    ON documents (supplier_id, type, superseded_at);

  CREATE TABLE IF NOT EXISTS audit_logs (
    id     TEXT PRIMARY KEY,
    kind   TEXT NOT NULL,
    actor  TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT,
    ip     TEXT,
    at     TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_logs_at ON audit_logs (at DESC);
`);

// Bancos criados antes da Fase 1 têm os papéis antigos e não possuem `active`.
// Recriamos apenas essa tabela para preservar os usuários existentes e permitir
// os novos papéis sem exigir que a pessoa apague o banco manualmente.
function migrateUsersTable() {
  const definition = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'")
    .get()?.sql || '';
  const columns = db.prepare('PRAGMA table_info(users)').all();
  const hasActive = columns.some((column) => column.name === 'active');
  const hasNewRoles = definition.includes("'gestor'") && definition.includes("'verificador'");

  if (hasActive && hasNewRoles) return;

  const activeValue = hasActive ? 'active' : '1';
  db.pragma('foreign_keys = OFF');
  try {
    db.transaction(() => {
      db.exec(`
        CREATE TABLE users_next (
          id            TEXT PRIMARY KEY,
          name          TEXT NOT NULL,
          email         TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          role          TEXT NOT NULL CHECK (role IN ('administrador', 'gestor', 'analista', 'fornecedor', 'verificador')),
          company       TEXT,
          supplier_id   TEXT REFERENCES suppliers(id),
          active        INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
          created_at    TEXT NOT NULL
        );
        INSERT INTO users_next (
          id, name, email, password_hash, password_salt, role, company, supplier_id, active, created_at
        )
        SELECT
          id, name, email, password_hash, password_salt,
          CASE role
            WHEN 'admin' THEN 'administrador'
            WHEN 'contratante' THEN 'gestor'
            ELSE role
          END,
          company, supplier_id, ${activeValue}, created_at
        FROM users;
        DROP TABLE users;
        ALTER TABLE users_next RENAME TO users;
      `);
    })();
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

migrateUsersTable();

// QR Codes antigos usavam o ID previsível do fornecedor. Cada fornecedor passa
// a ter um token aleatório, que pode ser trocado sem mudar seu cadastro.
function migrateSuppliersTable() {
  const columns = db.prepare('PRAGMA table_info(suppliers)').all();
  const names = new Set(columns.map((column) => column.name));

  if (!names.has('qr_token')) db.exec('ALTER TABLE suppliers ADD COLUMN qr_token TEXT');
  if (!names.has('qr_active')) {
    db.exec('ALTER TABLE suppliers ADD COLUMN qr_active INTEGER NOT NULL DEFAULT 1');
  }

  const withoutToken = db.prepare('SELECT id FROM suppliers WHERE qr_token IS NULL OR qr_token = ?');
  const updateToken = db.prepare('UPDATE suppliers SET qr_token = ?, qr_active = 1 WHERE id = ?');
  const rotateMissing = db.transaction(() => {
    withoutToken.all('').forEach((supplier) => updateToken.run(newId('spq'), supplier.id));
  });
  rotateMissing();
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_qr_token ON suppliers(qr_token)');
}

migrateSuppliersTable();

module.exports = db;
