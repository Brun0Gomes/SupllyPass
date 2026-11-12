const config = require('../config');

// Catalogo de documentos exigidos. A soma dos pesos e 100.
// Este arquivo e o espelho de src/utils/score.js do aplicativo:
// a regra do Supplier Score e a mesma nos dois lados.
const DOC_TYPES = [
  { key: 'contrato', label: 'Contrato de prestação', required: true, weight: 20 },
  { key: 'cnpj', label: 'Cartão CNPJ', required: true, weight: 15 },
  { key: 'cnd', label: 'Certidão negativa de débitos', required: true, weight: 15 },
  { key: 'lgpd', label: 'Política de LGPD', required: true, weight: 15 },
  { key: 'seguro', label: 'Apólice de seguro', required: false, weight: 12 },
  { key: 'treinamento', label: 'Certificado de treinamento', required: false, weight: 12 },
  { key: 'alvara', label: 'Alvará de funcionamento', required: false, weight: 11 },
];

const DOC_TYPE_MAP = Object.fromEntries(DOC_TYPES.map((t) => [t.key, t]));

function daysUntil(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}

function statusOf(document) {
  if (!document || !document.expires_at) return 'pendente';
  const days = daysUntil(document.expires_at);
  if (days < 0) return 'vencido';
  if (days <= config.alertWindowDays) return 'vencendo';
  return 'valido';
}

// Monta os 7 itens do passaporte, marcando como pendente o que nao foi enviado.
function buildPassport(documents) {
  return DOC_TYPES.map((type) => {
    const document = documents.find((d) => d.type === type.key) || null;
    const status = statusOf(document);
    return {
      key: type.key,
      label: type.label,
      required: type.required,
      weight: type.weight,
      status,
      daysLeft: document ? daysUntil(document.expires_at) : null,
      document: document
        ? {
            id: document.id,
            fileName: document.file_name,
            sha256: document.sha256,
            issuedAt: document.issued_at,
            expiresAt: document.expires_at,
            uploadedAt: document.uploaded_at,
            sizeBytes: document.size_bytes,
            downloadable: Boolean(document.stored_name),
          }
        : null,
    };
  });
}

// Valido soma o peso inteiro, vencendo soma metade, vencido/pendente soma zero.
function calcScore(passport) {
  const total = passport.reduce((sum, item) => {
    if (item.status === 'valido') return sum + item.weight;
    if (item.status === 'vencendo') return sum + item.weight * 0.5;
    return sum;
  }, 0);
  return Math.round(total);
}

// Qualquer documento OBRIGATORIO vencido ou ausente bloqueia a contratacao.
function overallStatus(passport) {
  const blocking = passport.some(
    (item) => item.required && (item.status === 'vencido' || item.status === 'pendente')
  );
  if (blocking) return 'irregular';
  const anyProblem = passport.some((item) => item.status !== 'valido');
  return anyProblem ? 'atencao' : 'regular';
}

function summarize(supplier, documents) {
  const passport = buildPassport(documents);
  return {
    id: supplier.id,
    name: supplier.name,
    cnpj: supplier.cnpj,
    category: supplier.category,
    city: supplier.city,
    email: supplier.email,
    since: supplier.since,
    score: calcScore(passport),
    status: overallStatus(passport),
    counts: {
      validos: passport.filter((i) => i.status === 'valido').length,
      vencendo: passport.filter((i) => i.status === 'vencendo').length,
      pendentes: passport.filter((i) => i.status === 'vencido' || i.status === 'pendente').length,
    },
    passport,
  };
}

module.exports = {
  DOC_TYPES,
  DOC_TYPE_MAP,
  daysUntil,
  statusOf,
  buildPassport,
  calcScore,
  overallStatus,
  summarize,
};
