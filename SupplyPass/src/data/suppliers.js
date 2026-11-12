import { isoFromToday } from '../utils/dates';

// Empresa contratante que esta usando o app (perfil "contratante").
export const CONTRATANTE = {
  name: 'Grupo Meridiano',
  unit: 'Diretoria de Suprimentos',
  user: 'Camila Ribeiro',
};

// Fornecedor logado no perfil "fornecedor".
export const MY_SUPPLIER_ID = 'FOR-1042';

// As datas sao geradas em relacao ao dia de hoje, entao a demonstracao
// mostra sempre os tres cenarios: valido, vencendo e irregular.
const suppliers = [
  {
    id: 'FOR-1017',
    name: 'Alfa Serviços de Limpeza Ltda',
    cnpj: '12.345.678/0001-90',
    category: 'Facilities',
    city: 'São Paulo - SP',
    email: 'contato@alfaservicos.com.br',
    since: '2021',
    documents: [
      { type: 'contrato', file: 'contrato_alfa_2026.pdf', issuedAt: isoFromToday(-200), expiresAt: isoFromToday(400) },
      { type: 'cnpj', file: 'cartao_cnpj.pdf', issuedAt: isoFromToday(-90), expiresAt: isoFromToday(280) },
      { type: 'cnd', file: 'cnd_federal.pdf', issuedAt: isoFromToday(-40), expiresAt: isoFromToday(140) },
      { type: 'lgpd', file: 'politica_lgpd_v3.pdf', issuedAt: isoFromToday(-120), expiresAt: isoFromToday(240) },
      { type: 'seguro', file: 'apolice_2026.pdf', issuedAt: isoFromToday(-60), expiresAt: isoFromToday(300) },
      { type: 'treinamento', file: 'nr06_equipe.pdf', issuedAt: isoFromToday(-30), expiresAt: isoFromToday(330) },
      { type: 'alvara', file: 'alvara_municipal.pdf', issuedAt: isoFromToday(-150), expiresAt: isoFromToday(210) },
    ],
  },
  {
    id: MY_SUPPLIER_ID,
    name: 'NovaTech Soluções em TI',
    cnpj: '23.456.789/0001-01',
    category: 'Tecnologia da Informação',
    city: 'São Paulo - SP',
    email: 'comercial@novatech.com.br',
    since: '2023',
    documents: [
      { type: 'contrato', file: 'contrato_novatech.pdf', issuedAt: isoFromToday(-180), expiresAt: isoFromToday(185) },
      { type: 'cnpj', file: 'cartao_cnpj.pdf', issuedAt: isoFromToday(-70), expiresAt: isoFromToday(295) },
      { type: 'cnd', file: 'cnd_federal.pdf', issuedAt: isoFromToday(-25), expiresAt: isoFromToday(155) },
      { type: 'lgpd', file: 'politica_privacidade.pdf', issuedAt: isoFromToday(-95), expiresAt: isoFromToday(270) },
      { type: 'seguro', file: 'seguro_rc_profissional.pdf', issuedAt: isoFromToday(-260), expiresAt: isoFromToday(105) },
      { type: 'treinamento', file: 'certificado_lgpd_equipe.pdf', issuedAt: isoFromToday(-353), expiresAt: isoFromToday(12) },
    ],
  },
  {
    id: 'FOR-1058',
    name: 'ConstruBase Engenharia',
    cnpj: '34.567.890/0001-12',
    category: 'Obras e manutenção',
    city: 'Guarulhos - SP',
    email: 'obras@construbase.com.br',
    since: '2019',
    documents: [
      { type: 'contrato', file: 'contrato_construbase.pdf', issuedAt: isoFromToday(-400), expiresAt: isoFromToday(90) },
      { type: 'cnpj', file: 'cartao_cnpj.pdf', issuedAt: isoFromToday(-120), expiresAt: isoFromToday(245) },
      { type: 'cnd', file: 'cnd_federal.pdf', issuedAt: isoFromToday(-210), expiresAt: isoFromToday(-14) },
      { type: 'seguro', file: 'apolice_obra.pdf', issuedAt: isoFromToday(-100), expiresAt: isoFromToday(265) },
      { type: 'alvara', file: 'alvara_obras.pdf', issuedAt: isoFromToday(-300), expiresAt: isoFromToday(65) },
    ],
  },
  {
    id: 'FOR-1063',
    name: 'Sabor & Cia Alimentação',
    cnpj: '45.678.901/0001-23',
    category: 'Alimentação',
    city: 'São Bernardo do Campo - SP',
    email: 'nutricao@saborecia.com.br',
    since: '2022',
    documents: [
      { type: 'contrato', file: 'contrato_refeitorio.pdf', issuedAt: isoFromToday(-150), expiresAt: isoFromToday(215) },
      { type: 'cnpj', file: 'cartao_cnpj.pdf', issuedAt: isoFromToday(-80), expiresAt: isoFromToday(285) },
      { type: 'cnd', file: 'cnd_federal.pdf', issuedAt: isoFromToday(-50), expiresAt: isoFromToday(130) },
      { type: 'lgpd', file: 'politica_lgpd.pdf', issuedAt: isoFromToday(-160), expiresAt: isoFromToday(205) },
      { type: 'seguro', file: 'apolice_alimentos.pdf', issuedAt: isoFromToday(-340), expiresAt: isoFromToday(25) },
      { type: 'alvara', file: 'alvara_vigilancia_sanitaria.pdf', issuedAt: isoFromToday(-110), expiresAt: isoFromToday(255) },
    ],
  },
  {
    id: 'FOR-1071',
    name: 'RotaCerta Transportes',
    cnpj: '56.789.012/0001-34',
    category: 'Logística',
    city: 'Osasco - SP',
    email: 'frota@rotacerta.com.br',
    since: '2020',
    documents: [
      { type: 'contrato', file: 'contrato_frete.pdf', issuedAt: isoFromToday(-220), expiresAt: isoFromToday(145) },
      { type: 'cnpj', file: 'cartao_cnpj.pdf', issuedAt: isoFromToday(-65), expiresAt: isoFromToday(300) },
      { type: 'cnd', file: 'cnd_federal.pdf', issuedAt: isoFromToday(-35), expiresAt: isoFromToday(145) },
      { type: 'lgpd', file: 'politica_lgpd.pdf', issuedAt: isoFromToday(-130), expiresAt: isoFromToday(235) },
      { type: 'seguro', file: 'seguro_carga.pdf', issuedAt: isoFromToday(-75), expiresAt: isoFromToday(290) },
      { type: 'alvara', file: 'licenca_transporte.pdf', issuedAt: isoFromToday(-140), expiresAt: isoFromToday(225) },
    ],
  },
  {
    id: 'FOR-1084',
    name: 'SegPrime Vigilância Patrimonial',
    cnpj: '67.890.123/0001-45',
    category: 'Segurança patrimonial',
    city: 'São Paulo - SP',
    email: 'operacoes@segprime.com.br',
    since: '2018',
    documents: [
      { type: 'contrato', file: 'contrato_vigilancia.pdf', issuedAt: isoFromToday(-760), expiresAt: isoFromToday(-31) },
      { type: 'cnpj', file: 'cartao_cnpj.pdf', issuedAt: isoFromToday(-55), expiresAt: isoFromToday(310) },
      { type: 'cnd', file: 'cnd_federal.pdf', issuedAt: isoFromToday(-45), expiresAt: isoFromToday(135) },
      { type: 'lgpd', file: 'politica_lgpd.pdf', issuedAt: isoFromToday(-170), expiresAt: isoFromToday(195) },
      { type: 'treinamento', file: 'reciclagem_vigilantes.pdf', issuedAt: isoFromToday(-20), expiresAt: isoFromToday(345) },
    ],
  },
  {
    id: 'FOR-1096',
    name: 'VerdeVale Manutenção Predial',
    cnpj: '78.901.234/0001-56',
    category: 'Facilities',
    city: 'Santo André - SP',
    email: 'atendimento@verdevale.com.br',
    since: '2024',
    documents: [
      { type: 'contrato', file: 'contrato_manutencao.pdf', issuedAt: isoFromToday(-100), expiresAt: isoFromToday(265) },
      { type: 'cnpj', file: 'cartao_cnpj.pdf', issuedAt: isoFromToday(-48), expiresAt: isoFromToday(317) },
      { type: 'cnd', file: 'cnd_federal.pdf', issuedAt: isoFromToday(-28), expiresAt: isoFromToday(152) },
      { type: 'lgpd', file: 'politica_lgpd.pdf', issuedAt: isoFromToday(-88), expiresAt: isoFromToday(277) },
      { type: 'seguro', file: 'apolice_predial.pdf', issuedAt: isoFromToday(-68), expiresAt: isoFromToday(297) },
      { type: 'treinamento', file: 'nr10_equipe.pdf', issuedAt: isoFromToday(-38), expiresAt: isoFromToday(327) },
      { type: 'alvara', file: 'alvara_municipal.pdf', issuedAt: isoFromToday(-98), expiresAt: isoFromToday(267) },
    ],
  },
  {
    id: 'FOR-1105',
    name: 'PapelExpress Suprimentos',
    cnpj: '89.012.345/0001-67',
    category: 'Suprimentos de escritório',
    city: 'Barueri - SP',
    email: 'vendas@papelexpress.com.br',
    since: '2023',
    documents: [
      { type: 'contrato', file: 'contrato_suprimentos.pdf', issuedAt: isoFromToday(-190), expiresAt: isoFromToday(175) },
      { type: 'cnpj', file: 'cartao_cnpj.pdf', issuedAt: isoFromToday(-58), expiresAt: isoFromToday(307) },
      { type: 'cnd', file: 'cnd_federal.pdf', issuedAt: isoFromToday(-30), expiresAt: isoFromToday(150) },
      { type: 'lgpd', file: 'politica_lgpd.pdf', issuedAt: isoFromToday(-360), expiresAt: isoFromToday(5) },
      { type: 'seguro', file: 'apolice_transporte.pdf', issuedAt: isoFromToday(-85), expiresAt: isoFromToday(280) },
      { type: 'alvara', file: 'alvara_municipal.pdf', issuedAt: isoFromToday(-125), expiresAt: isoFromToday(240) },
    ],
  },
];

export default suppliers;
