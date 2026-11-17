const crypto = require('node:crypto');

const config = require('../config');

function signatureFor(token) {
  return crypto
    .createHmac('sha256', config.qrSigningSecret)
    .update(`supplypass-qr:v1:${String(token).toLowerCase()}`)
    .digest('hex')
    .slice(0, 16);
}

function formatQrCode(token) {
  return `SUPPLYPASS:${String(token).toUpperCase()}.${signatureFor(token).toUpperCase()}`;
}

function verifyQrSignature(token, signature) {
  const supplied = Buffer.from(String(signature || '').toLowerCase());
  const expected = Buffer.from(signatureFor(token));
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

module.exports = { formatQrCode, verifyQrSignature };
