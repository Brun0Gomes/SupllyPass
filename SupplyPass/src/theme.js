// Identidade visual do SupplyPass.
// Azul institucional para a marca; verde/ambar/vermelho SOMENTE para status.

export const colors = {
  primary: '#0B4F9E',
  primaryDark: '#083A76',
  primarySoft: '#E8F0FA',

  bg: '#F3F5F9',
  card: '#FFFFFF',
  border: '#E3E8F0',

  text: '#0F1B2D',
  textMuted: '#5F6E85',
  textLight: '#8A97AB',

  green: '#15803D',
  greenSoft: '#E6F5EC',
  amber: '#B45309',
  amberSoft: '#FDF2E3',
  red: '#B91C1C',
  redSoft: '#FCEBEB',

  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const shadow = {
  shadowColor: '#0F1B2D',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

export const font = {
  h1: { fontSize: 24, fontWeight: '700', color: colors.text },
  h2: { fontSize: 18, fontWeight: '700', color: colors.text },
  h3: { fontSize: 15, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, color: colors.text },
  small: { fontSize: 12, color: colors.textMuted },
  tiny: { fontSize: 11, color: colors.textLight },
};
