const Database = require('better-sqlite3');

const config = require('../config');

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
    role          TEXT NOT NULL CHECK (role IN ('contratante', 'fornecedor', 'admin')),
    company       TEXT,
    supplier_id   TEXT REFERENCES suppliers(id),
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

module.exports = db;
