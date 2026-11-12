import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Card from '../components/Card';
import PassportBody from '../components/PassportBody';
import PrimaryButton from '../components/PrimaryButton';
import Screen from '../components/Screen';
import SectionTitle from '../components/SectionTitle';
import { useApp } from '../context/AppContext';
import { colors, spacing } from '../theme';
import { ALERT_WINDOW_DAYS } from '../utils/score';

export default function SupplierPassportScreen({ route, navigation }) {
  const { getSupplier, registerCheck } = useApp();
  const [busy, setBusy] = useState(false);
  const supplier = getSupplier(route.params.id);

  if (!supplier) {
    return (
      <Screen title="Passaporte" onBack={() => navigation.goBack()}>
        <Text style={styles.note}>Fornecedor não encontrado.</Text>
      </Screen>
    );
  }

  const registrarVerificacao = async () => {
    setBusy(true);
    try {
      await registerCheck(supplier);
      Alert.alert(
        'Verificação registrada',
        'A consulta foi gravada na trilha de auditoria com data, hora e responsável.'
      );
    } catch (error) {
      Alert.alert('Não foi possível registrar', error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Passaporte do fornecedor" subtitle={supplier.id} onBack={() => navigation.goBack()}>
      <PassportBody supplier={supplier} />

      <SectionTitle>Contato</SectionTitle>
      <Card>
        <Row icon="mail-outline" label={supplier.email} />
        <Row icon="location-outline" label={supplier.city} />
        <Row icon="pricetag-outline" label={supplier.category} last />
      </Card>

      <View style={styles.actions}>
        <PrimaryButton
          label={busy ? 'Registrando...' : 'Registrar verificação'}
          icon="checkmark-done-outline"
          onPress={registrarVerificacao}
          disabled={busy}
        />
      </View>

      <Card style={styles.ruleCard}>
        <Text style={styles.ruleTitle}>Como o Supplier Score é calculado</Text>
        <Text style={styles.ruleText}>
          Cada documento tem um peso (a soma é 100). Documento válido soma o peso inteiro, documento
          vencendo em até {ALERT_WINDOW_DAYS} dias soma metade, e documento vencido ou não enviado
          soma zero. Qualquer documento obrigatório irregular bloqueia a contratação, independente da
          nota.
        </Text>
      </Card>
    </Screen>
  );
}

function Row({ icon, label, last }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }]}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={styles.rowText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: { fontSize: 13, color: colors.text, flex: 1 },
  actions: { marginTop: spacing.xl },
  ruleCard: { marginTop: spacing.lg, backgroundColor: colors.primarySoft, borderColor: '#CFE0F5' },
  ruleTitle: { fontSize: 13, fontWeight: '700', color: colors.primaryDark, marginBottom: 4 },
  ruleText: { fontSize: 12, color: colors.primaryDark, lineHeight: 18 },
});
