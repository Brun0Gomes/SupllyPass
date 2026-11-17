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
    title: 'Criptografia em repouso',
    text: 'Os arquivos enviados à API são cifrados com AES-256-GCM antes de serem gravados no armazenamento.',
  },
  {
    icon: 'create-outline',
    title: 'Integridade documental',
    text: 'Cada envio recebe um hash SHA-256. O sistema confere esse hash ao recuperar o arquivo para detectar alterações.',
  },
  {
    icon: 'finger-print-outline',
    title: 'Autenticação reforçada',
    text: 'Gestor e Administrador usam MFA por código temporário (TOTP). As sessões expiram por tempo máximo ou 30 minutos sem atividade.',
  },
  {
    icon: 'people-outline',
    title: 'Controle de acesso',
    text: 'O fornecedor acessa somente os próprios arquivos. Gestor, analista e administrador têm permissões distintas sobre os passaportes.',
  },
  {
    icon: 'list-outline',
    title: 'Logs de auditoria',
    text: 'A API registra logins, uploads, downloads e verificações com autor, alvo, data e hora. Centralização externa de logs é a próxima etapa.',
  },
  {
    icon: 'shield-half-outline',
    title: 'Proteção de dados',
    text: 'Esta demonstração limita os dados cadastrados. Política de retenção, atendimento aos titulares e gestão LGPD serão implementados antes da produção.',
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
