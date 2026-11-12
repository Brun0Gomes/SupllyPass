import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Card from '../components/Card';
import Screen from '../components/Screen';
import SectionTitle from '../components/SectionTitle';
import { colors, radius, spacing } from '../theme';

const CONTROLS = [
  {
    icon: 'lock-closed-outline',
    title: 'Criptografia',
    text: 'Documentos criptografados em trânsito (TLS) e em repouso (AES-256). O arquivo nunca fica legível no armazenamento.',
  },
  {
    icon: 'create-outline',
    title: 'Assinatura digital',
    text: 'Cada envio é assinado digitalmente, provando quem enviou, quando enviou e que o arquivo é aquele mesmo.',
  },
  {
    icon: 'finger-print-outline',
    title: 'Autenticação',
    text: 'Login com verificação em dois fatores e sessão expirando por inatividade.',
  },
  {
    icon: 'git-compare-outline',
    title: 'Integridade documental',
    text: 'Hash SHA-256 gerado no upload. Se um byte mudar, o hash muda e o sistema acusa adulteração.',
  },
  {
    icon: 'people-outline',
    title: 'Controle de acesso',
    text: 'Cada perfil vê apenas o que lhe cabe. O fornecedor enxerga os próprios arquivos; a contratante enxerga status, não conteúdo.',
  },
  {
    icon: 'list-outline',
    title: 'Logs de auditoria',
    text: 'Registro imutável de acessos, envios e verificações, com autor, alvo, data e hora.',
  },
  {
    icon: 'shield-half-outline',
    title: 'Proteção de dados (LGPD)',
    text: 'Coleta mínima, finalidade declarada e retenção limitada ao prazo do contrato.',
  },
];

const ODS = [
  {
    number: '8',
    title: 'Trabalho decente e crescimento econômico',
    text: 'Exigir certidões, seguro e treinamento em dia reduz informalidade e risco na cadeia de fornecedores.',
  },
  {
    number: '9',
    title: 'Indústria, inovação e infraestrutura',
    text: 'Substitui e-mail, planilha e WhatsApp por um processo digital, rastreável e auditável.',
  },
  {
    number: '12',
    title: 'Consumo e produção responsáveis',
    text: 'Menos papel e menos retrabalho: a homologação vira consulta em segundos, não uma troca de arquivos.',
  },
];

export default function SecurityScreen() {
  return (
    <Screen title="Segurança e conformidade" subtitle="Como o SupplyPass protege os documentos">
      <Card style={styles.intro}>
        <Text style={styles.introTitle}>Documento é dado sensível</Text>
        <Text style={styles.introText}>
          Um passaporte de fornecedor concentra contrato, CNPJ, certidões e apólices. Por isso a
          segurança não é um extra do projeto: é parte do produto.
        </Text>
      </Card>

      <SectionTitle>Controles de segurança</SectionTitle>
      {CONTROLS.map((item) => (
        <Card key={item.title} style={styles.item}>
          <View style={styles.itemIcon}>
            <Ionicons name={item.icon} size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemText}>{item.text}</Text>
          </View>
        </Card>
      ))}

      <SectionTitle hint="Agenda 2030 da ONU">Objetivos de Desenvolvimento Sustentável</SectionTitle>
      {ODS.map((item) => (
        <Card key={item.number} style={styles.item}>
          <View style={styles.odsNumber}>
            <Text style={styles.odsNumberText}>{item.number}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemText}>{item.text}</Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { backgroundColor: colors.primarySoft, borderColor: '#CFE0F5' },
  introTitle: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
  introText: { fontSize: 13, color: colors.primaryDark, marginTop: 4, lineHeight: 19 },
  item: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md, alignItems: 'flex-start' },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemText: { fontSize: 12, color: colors.textMuted, marginTop: 3, lineHeight: 18 },
  odsNumber: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  odsNumberText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
