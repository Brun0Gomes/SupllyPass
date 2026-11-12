// Simulacao didatica de hash de integridade (SHA-256 fake).
// Em producao isso seria calculado no servidor sobre o arquivo real.
export function fakeHash(seed) {
  const text = String(seed);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i += 1) {
    h1 = (h1 ^ text.charCodeAt(i)) >>> 0;
    h1 = (h1 * 16777619) >>> 0;
    h2 = (h2 + text.charCodeAt(i) * (i + 7)) >>> 0;
  }
  let out = '';
  for (let i = 0; i < 8; i += 1) {
    h1 = (h1 * 16777619 + i) >>> 0;
    h2 = (h2 * 2654435761 + i) >>> 0;
    out += ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
  }
  return out.slice(0, 64);
}

export function shortHash(seed) {
  const full = fakeHash(seed);
  return `${full.slice(0, 8)}…${full.slice(-8)}`;
}
