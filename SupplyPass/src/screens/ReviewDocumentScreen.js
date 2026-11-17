import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import Screen from '../components/Screen';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';
import { formatDate, formatDateTime } from '../utils/dates';

export default function ReviewDocumentScreen({ route, navigation }) {
  const { reviews, reviewDocument } = useApp();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const review = reviews.find((entry) => entry.id === route.params?.reviewId);

  if (!review) {
    return (
      <Screen title="Análise documental" onBack={() => navigation.goBack()}>
        <Text style={styles.muted}>Este documento já saiu da fila. Atualize a tela de análises.</Text>
      </Screen>
    );
  }

  const decide = async (decision) => {
    const reason = note.trim();
    if (decision === 'rejected' && reason.length < 5) {
      Alert.alert('Justificativa obrigatória', 'Explique em pelo menos 5 caracteres o que precisa ser corrigido.');
      return;
    }

    setBusy(true);
    try {
      await reviewDocument(review.id, { decision, note: reason });
      Alert.alert(
        decision === 'approved' ? 'Documento aprovado' : 'Documento reprovado',
        decision === 'approved'
          ? 'O documento passa a contar no passaporte do fornecedor.'
          : 'O fornecedor verá a justificativa e poderá enviar uma nova versão.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Não foi possível registrar a decisão', error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Análise documental" subtitle={review.supplierName} onBack={() => navigation.goBack()}>
      <Card>
        <View style={styles.fileHeader}>
          <View style={styles.fileIcon}>
            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{review.label}</Text>
            <Text style={styles.fileName}>{review.fileName}</Text>
          </View>
        </View>
        <Row icon="business-outline" label="Fornecedor" value={review.supplierName} />
        <Row icon="calendar-outline" label="Enviado em" value={formatDateTime(review.uploadedAt)} />
        <Row icon="time-outline" label="Validade" value={formatDate(review.expiresAt)} />
        <Row icon="finger-print-outline" label="SHA-256" value={`${review.sha256?.slice(0, 18) || '--'}…`} last />
      </Card>

      <View style={styles.notice}>
        <Ionicons name="information-circle-outline" size={17} color={colors.primaryDark} />
        <Text style={styles.noticeText}>
          Confira o documento recebido no processo seguro da empresa. A decisão ficará registrada na trilha de auditoria.
        </Text>
      </View>

      <Text style={styles.inputLabel}>Comentário para o fornecedor</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={500}
        placeholder="Obrigatório se reprovar; opcional se aprovar"
        placeholderTextColor={colors.textLight}
        textAlignVertical="top"
        style={styles.input}
      />
      <Text style={styles.counter}>{note.length}/500</Text>

      <PrimaryButton
        label={busy ? 'Salvando...' : 'Aprovar documento'}
        icon="checkmark-circle-outline"
        onPress={() => decide('approved')}
        disabled={busy}
        style={{ marginTop: spacing.lg }}
      />
      <PrimaryButton
        label="Reprovar e solicitar correção"
        icon="close-circle-outline"
        variant="outline"
        onPress={() => decide('rejected')}
        disabled={busy}
        style={{ marginTop: spacing.md }}
      />
    </Screen>
  );
}

function Row({ icon, label, value, last }) {
  return (
    <View style={[styles.row, last && styles.lastRow]}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted },
  fileHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  fileIcon: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  fileName: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  lastRow: { borderBottomWidth: 0, paddingBottom: 0 },
  rowLabel: { fontSize: 11, color: colors.textLight },
  rowValue: { fontSize: 12, color: colors.text, fontWeight: '600', marginTop: 1 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  noticeText: { flex: 1, fontSize: 12, color: colors.primaryDark, lineHeight: 17 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  input: { minHeight: 110, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.card, padding: spacing.md, fontSize: 14, color: colors.text },
  counter: { fontSize: 11, color: colors.textLight, textAlign: 'right', marginTop: 4 },
});
