import { colors } from '../theme';
import { daysUntil } from './dates';

// Janela de alerta: um documento entra em "vencendo" quando falta menos que isso.
export const ALERT_WINDOW_DAYS = 30;

// Catalogo de documentos exigidos. A soma dos pesos e 100.
export const DOC_TYPES = [
  { key: 'contrato', label: 'Contrato de prestação', required: true, weight: 20, icon: 'document-text-outline' },
  { key: 'cnpj', label: 'Cartão CNPJ', required: true, weight: 15, icon: 'business-outline' },
  { key: 'cnd', label: 'Certidão negativa de débitos', required: true, weight: 15, icon: 'receipt-outline' },
  { key: 'lgpd', label: 'Política de LGPD', required: true, weight: 15, icon: 'lock-closed-outline' },
  { key: 'seguro', label: 'Apólice de seguro', required: false, weight: 12, icon: 'umbrella-outline' },
  { key: 'treinamento', label: 'Certificado de treinamento', required: false, weight: 12, icon: 'school-outline' },
  { key: 'alvara', label: 'Alvará de funcionamento', required: false, weight: 11, icon: 'ribbon-outline' },
];

export const DOC_TYPE_MAP = DOC_TYPES.reduce((acc, t) => {
  acc[t.key] = t;
  return acc;
}, {});

export const DOC_STATUS = {
  valido: {
    key: 'valido',
    label: 'Válido',
    mark: '✅',
    color: colors.green,
    soft: colors.greenSoft,
    icon: 'checkmark-circle',
  },
  vencendo: {
    key: 'vencendo',
    label: 'Vencendo',
    mark: '⚠️',
    color: colors.amber,
    soft: colors.amberSoft,
    icon: 'alert-circle',
  },
  vencido: {
    key: 'vencido',
    label: 'Vencido',
    mark: '❌',
    color: colors.red,
    soft: colors.redSoft,
    icon: 'close-circle',
  },
  pendente: {
    key: 'pendente',
    label: 'Pendente',
    mark: '❌',
    color: colors.red,
    soft: colors.redSoft,
    icon: 'ellipse-outline',
  },
};

export const OVERALL_STATUS = {
  regular: {
    key: 'regular',
    label: 'Documentação regular',
    short: 'Regular',
    mark: '🟢',
    color: colors.green,
    soft: colors.greenSoft,
    icon: 'shield-checkmark',
    message: 'Fornecedor apto para contratação.',
  },
  atencao: {
    key: 'atencao',
    label: 'Atenção na documentação',
    short: 'Atenção',
    mark: '⚠️',
    color: colors.amber,
    soft: colors.amberSoft,
    icon: 'alert',
    message: 'Apto, mas há documento vencendo ou complementar pendente.',
  },
  irregular: {
    key: 'irregular',
    label: 'Documentação irregular',
    short: 'Irregular',
    mark: '❌',
    color: colors.red,
    soft: colors.redSoft,
    icon: 'close-circle',
    message: 'Contratação bloqueada até a regularização.',
  },
};

// Status de um unico documento.
export function getDocStatus(doc) {
  if (!doc || !doc.expiresAt) return DOC_STATUS.pendente;
  const days = daysUntil(doc.expiresAt);
  if (days < 0) return DOC_STATUS.vencido;
  if (days <= ALERT_WINDOW_DAYS) return DOC_STATUS.vencendo;
  return DOC_STATUS.valido;
}

// Devolve SEMPRE os 7 tipos, marcando como pendente o que o fornecedor nao enviou.
export function getPassport(supplier) {
  return DOC_TYPES.map((type) => {
    const doc = (supplier.documents || []).find((d) => d.type === type.key) || null;
    const status = getDocStatus(doc);
    return {
      ...type,
      doc,
      status,
      daysLeft: doc && doc.expiresAt ? daysUntil(doc.expiresAt) : null,
    };
  });
}

// Supplier Score: valido soma o peso inteiro, vencendo soma metade,
// vencido ou pendente soma zero.
export function calcScore(supplier) {
  const passport = getPassport(supplier);
  const total = passport.reduce((sum, item) => {
    if (item.status.key === 'valido') return sum + item.weight;
    if (item.status.key === 'vencendo') return sum + item.weight * 0.5;
    return sum;
  }, 0);
  return Math.round(total);
}

// Status geral: qualquer obrigatorio vencido/pendente derruba para irregular.
export function getOverallStatus(supplier) {
  const passport = getPassport(supplier);
  const blocking = passport.some(
    (item) => item.required && (item.status.key === 'vencido' || item.status.key === 'pendente')
  );
  if (blocking) return OVERALL_STATUS.irregular;
  const anyProblem = passport.some(
    (item) => item.status.key === 'vencido' || item.status.key === 'pendente' || item.status.key === 'vencendo'
  );
  if (anyProblem) return OVERALL_STATUS.atencao;
  return OVERALL_STATUS.regular;
}

export function scoreColor(score) {
  if (score >= 80) return colors.green;
  if (score >= 50) return colors.amber;
  return colors.red;
}

export function summarize(supplier) {
  const passport = getPassport(supplier);
  return {
    passport,
    score: calcScore(supplier),
    overall: getOverallStatus(supplier),
    validos: passport.filter((i) => i.status.key === 'valido').length,
    vencendo: passport.filter((i) => i.status.key === 'vencendo').length,
    problemas: passport.filter((i) => i.status.key === 'vencido' || i.status.key === 'pendente').length,
  };
}

// Codigo lido/gravado no QR Code.
export function passportCode(supplier) {
  return `SUPPLYPASS:${supplier.id}`;
}

export function parsePassportCode(raw) {
  if (!raw) return null;
  const text = String(raw).trim().toUpperCase();
  if (text.startsWith('SUPPLYPASS:')) return text.replace('SUPPLYPASS:', '');
  if (/^FOR-\d{3,}$/.test(text)) return text;
  return null;
}
