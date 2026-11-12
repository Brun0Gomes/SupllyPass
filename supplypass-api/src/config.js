const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const storageDir = path.join(rootDir, 'storage');
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET must be defined in .env. See .env.example.');
}

// As pastas de dados e de arquivos sao criadas na primeira execucao.
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(storageDir, { recursive: true });

// Chave AES-256 (32 bytes) usada para criptografar os arquivos em repouso.
// Em producao ela viria de um cofre de segredos; aqui, se nao houver variavel
// de ambiente, geramos uma vez e guardamos em data/file.key.
function loadFileKey() {
  if (process.env.FILE_KEY && process.env.FILE_KEY.length === 64) {
    return Buffer.from(process.env.FILE_KEY, 'hex');
  }
  const keyPath = path.join(dataDir, 'file.key');
  if (!fs.existsSync(keyPath)) {
    fs.writeFileSync(keyPath, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  }
  return Buffer.from(fs.readFileSync(keyPath, 'utf8').trim(), 'hex');
}

module.exports = {
  port: Number(process.env.PORT || 3333),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  dbFile: process.env.DB_FILE || path.join(dataDir, 'supplypass.db'),
  dataDir,
  storageDir,
  fileKey: loadFileKey(),
  // Janela de alerta: documento com vencimento dentro desse prazo entra em "vencendo".
  alertWindowDays: Number(process.env.ALERT_WINDOW_DAYS || 30),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024),
};
