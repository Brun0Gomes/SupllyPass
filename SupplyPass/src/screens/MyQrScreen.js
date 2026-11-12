import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

import Card from '../components/Card';
import Screen from '../components/Screen';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';
import { getOverallStatus, calcScore, passportCode } from '../utils/score';

export default function MyQrScreen() {
  const { mySupplier } = useApp();

  if (!mySupplier) {
    return (
      <Screen title="Meu QR Code" subtitle="Carregando...">
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      </Screen>
    );
  }

  const code = passportCode(mySupplier);
  const overall = getOverallStatus(mySupplier);
  const score = calcScore(mySupplier);

  return (
    <Screen title="Meu QR Code" subtitle="Apresente na portaria ou ao setor de compras">
      <Card style={styles.card}>
        <Text style={styles.name}>{mySupplier.name}</Text>
        <Text style={styles.cnpj}>CNPJ {mySupplier.cnpj}</Text>

        <View style={styles.qrBox}>
          <QRCode value={code} size={196} color={colors.text} backgroundColor={colors.white} />
        </View>

        <Text style={styles.code}>{code}</Text>
        <View style={styles.badgeRow}>
          <StatusBadge status={overall} text={`${overall.short} · ${score}/100`} />
        </View>
      </Card>

      <View style={styles.note}>
        <Ionicons name="eye-off-outline" size={16} color={colors.primaryDark} />
        <Text style={styles.noteText}>
          A leitura do QR Code mostra apenas o status da documentação e o score. Nenhum arquivo é
          exposto: quem escaneia não baixa nem visualiza os documentos.
        </Text>
      </View>

      <View style={styles.note}>
        <Ionicons name="refresh-outline" size={16} color={colors.primaryDark} />
        <Text style={styles.noteText}>
          O resultado é sempre calculado na hora. Se um documento vencer hoje, o QR passa a mostrar o
          novo status imediatamente, sem precisar gerar outro código.
        </Text>
      </View>

      <View style={styles.note}>
        <Ionicons name="keypad-outline" size={16} color={colors.primaryDark} />
        <Text style={styles.noteText}>
          Sem câmera disponível? A contratante pode digitar o código {mySupplier.id} na tela de
          verificação.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center' },
  name: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  cnpj: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  qrBox: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.lg,
  },
  code: { fontSize: 12, color: colors.textMuted, letterSpacing: 0.5 },
  badgeRow: { marginTop: spacing.md },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  noteText: { flex: 1, fontSize: 12, color: colors.primaryDark, lineHeight: 17 },
});
