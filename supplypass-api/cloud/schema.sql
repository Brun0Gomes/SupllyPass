-- Esquema separado para a API. Execute somente em um projeto de destino dedicado.
-- Não concede acesso à Data API para clientes anon/authenticated.
BEGIN;
CREATE SCHEMA IF NOT EXISTS supplypass_private;
REVOKE ALL ON SCHEMA supplypass_private FROM PUBLIC;

CREATE TABLE IF NOT EXISTS supplypass_private.suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  city TEXT,
  email TEXT,
  since TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  qr_token TEXT UNIQUE,
  qr_active INTEGER NOT NULL DEFAULT 1 CHECK (qr_active IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS supplypass_private.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('administrador', 'gestor', 'analista', 'fornecedor', 'verificador')),
  company TEXT,
  supplier_id TEXT REFERENCES supplypass_private.suppliers(id),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  mfa_secret TEXT,
  mfa_pending_secret TEXT,
  mfa_enabled INTEGER NOT NULL DEFAULT 0 CHECK (mfa_enabled IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS supplypass_private.documents (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL REFERENCES supplypass_private.suppliers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  stored_name TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  sha256 TEXT NOT NULL,
  iv TEXT,
  auth_tag TEXT,
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  uploaded_by TEXT,
  uploaded_at TEXT NOT NULL,
  superseded_at TEXT,
  review_status TEXT NOT NULL DEFAULT 'approved' CHECK (review_status IN ('pending', 'approved', 'rejected')),
  review_note TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_documents_current ON supplypass_private.documents (supplier_id, type, superseded_at);
CREATE INDEX IF NOT EXISTS idx_documents_review_queue ON supplypass_private.documents (review_status, superseded_at, uploaded_at DESC);

CREATE TABLE IF NOT EXISTS supplypass_private.audit_logs (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, actor TEXT NOT NULL,
  action TEXT NOT NULL, target TEXT, ip TEXT, at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_logs_at ON supplypass_private.audit_logs (at DESC);

CREATE TABLE IF NOT EXISTS supplypass_private.sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES supplypass_private.users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON supplypass_private.sessions (user_id, revoked_at);

REVOKE ALL ON ALL TABLES IN SCHEMA supplypass_private FROM PUBLIC;
COMMIT;
