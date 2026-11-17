require('dotenv').config();

const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

function requiredValue(name, { minLength = 1 } = {}) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} must be defined in .env. See .env.example.`);
  if (value.length < minLength) {
    throw new Error(`${name} must contain at least ${minLength} characters.`);
  }
  return value;
}

function positiveInteger(name, fallback, { max } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || (max && value > max)) {
    throw new Error(`${name} must be a positive integer${max ? ` up to ${max}` : ''}.`);
  }
  return value;
}

function commaSeparated(name) {
  return String(process.env[name] || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const storageDir = path.join(rootDir, 'storage');
const jwtSecret = requiredValue('JWT_SECRET', { minLength: 32 });
const demoPassword = requiredValue('DEMO_PASSWORD', { minLength: 10 });

// As pastas de dados e de arquivos sao criadas na primeira execucao.
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(storageDir, { recursive: true });

// Chave AES-256 (32 bytes) usada para criptografar os arquivos em repouso.
// Em producao ela viria de um cofre de segredos; aqui, se nao houver variavel
// de ambiente, geramos uma vez e guardamos em data/file.key.
function loadFileKey() {
  const fileKey = String(process.env.FILE_KEY || '').trim();
  if (fileKey) {
    if (!/^[a-fA-F0-9]{64}$/.test(fileKey)) {
      throw new Error('FILE_KEY must be 64 hexadecimal characters.');
    }
    return Buffer.from(fileKey, 'hex');
  }
  const keyPath = path.join(dataDir, 'file.key');
  if (!fs.existsSync(keyPath)) {
    fs.writeFileSync(keyPath, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  }
  return Buffer.from(fs.readFileSync(keyPath, 'utf8').trim(), 'hex');
}

module.exports = {
  port: positiveInteger('PORT', 3333, { max: 65535 }),
  jwtSecret,
  demoPassword,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  sessionMaxHours: positiveInteger('SESSION_MAX_HOURS', 8, { max: 24 }),
  sessionIdleMinutes: positiveInteger('SESSION_IDLE_MINUTES', 30, { max: 480 }),
  loginMaxAttempts: positiveInteger('LOGIN_MAX_ATTEMPTS', 5, { max: 20 }),
  loginLockMinutes: positiveInteger('LOGIN_LOCK_MINUTES', 15, { max: 1440 }),
  totpIssuer: process.env.TOTP_ISSUER || 'SupplyPass',
  corsOrigins: commaSeparated('CORS_ORIGINS'),
  qrSigningSecret: String(process.env.QR_SIGNING_SECRET || jwtSecret),
  dbFile: process.env.DB_FILE || path.join(dataDir, 'supplypass.db'),
  dataDir,
  storageDir,
  fileKey: loadFileKey(),
  // Janela de alerta: documento com vencimento dentro desse prazo entra em "vencendo".
  alertWindowDays: positiveInteger('ALERT_WINDOW_DAYS', 30),
  maxUploadBytes: positiveInteger('MAX_UPLOAD_BYTES', 10 * 1024 * 1024),
};
