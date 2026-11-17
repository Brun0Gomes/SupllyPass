const SIGNATURES = [
  { mimeType: 'application/pdf', bytes: Buffer.from('%PDF-') },
  { mimeType: 'image/png', bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  { mimeType: 'image/jpeg', bytes: Buffer.from([0xff, 0xd8, 0xff]) },
];

function detectAllowedFile(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  const found = SIGNATURES.find(({ bytes }) => buffer.length >= bytes.length && buffer.subarray(0, bytes.length).equals(bytes));
  return found ? { mimeType: found.mimeType } : null;
}

module.exports = { detectAllowedFile };
