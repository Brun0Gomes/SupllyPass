const crypto = require('node:crypto');

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;

function base32Encode(buffer) {
  let bits = '';
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
  let output = '';
  for (let index = 0; index + 5 <= bits.length; index += 5) {
    output += ALPHABET[Number.parseInt(bits.slice(index, index + 5), 2)];
  }
  return output;
}

function base32Decode(value) {
  const normalized = String(value || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const character of normalized) {
    const position = ALPHABET.indexOf(character);
    if (position < 0) throw new Error('Segredo TOTP inválido.');
    bits += position.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateSecret() {
  return base32Encode(crypto.randomBytes(20));
}

function codeAt(secret, counter) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', base32Decode(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1000000).padStart(6, '0');
}

function verifyCode(secret, candidate, { now = Date.now(), window = 1 } = {}) {
  const code = String(candidate || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(code) || !secret) return false;
  const counter = Math.floor(now / 1000 / STEP_SECONDS);
  return Array.from({ length: window * 2 + 1 }, (_, index) => counter - window + index).some((slot) => {
    const expected = codeAt(secret, slot);
    return crypto.timingSafeEqual(Buffer.from(code), Buffer.from(expected));
  });
}

function otpauthUrl({ secret, account, issuer }) {
  const label = `${issuer}:${account}`;
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
}

module.exports = { generateSecret, verifyCode, otpauthUrl };
