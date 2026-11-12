const crypto = require('node:crypto');

// ---------------------------------------------------------------------------
// Integridade documental: hash SHA-256 do arquivo original.
// Se um unico byte do arquivo mudar, o hash muda por completo.
// ---------------------------------------------------------------------------
function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ---------------------------------------------------------------------------
// Criptografia em repouso: AES-256-GCM.
// GCM alem de cifrar produz um "authTag" que detecta adulteracao do arquivo
// cifrado - se alguem mexer no disco, a decifragem falha.
// ---------------------------------------------------------------------------
function encryptBuffer(plainBuffer, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
  };
}

function decryptBuffer(encryptedBuffer, key, ivHex, authTagHex) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
}

// ---------------------------------------------------------------------------
// Senhas: scrypt com sal aleatorio por usuario.
// Nunca guardamos a senha, apenas o derivado.
// ---------------------------------------------------------------------------
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, expectedHash, salt) {
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (candidate.length !== expected.length) return false;
  // Comparacao em tempo constante evita ataque de temporizacao.
  return crypto.timingSafeEqual(candidate, expected);
}

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

module.exports = {
  sha256,
  encryptBuffer,
  decryptBuffer,
  hashPassword,
  verifyPassword,
  newId,
};
