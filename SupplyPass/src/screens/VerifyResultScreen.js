import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import ScoreGauge from '../components/ScoreGauge';
import Screen from '../components/Screen';
import SectionTitle from '../components/SectionTitle';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';
import { formatDateTime } from '../utils/dates';
import { DOC_STATUS, OVERALL_STATUS, summarize } from '../utils/score';

export default function VerifyResultScreen({ route, navigation }) {
  const { role } = useApp();
  const result = route.params?.result;
  const supplier = result?.supplier;
  const canViewPassport = ['administrador', 'gestor', 'analista'].includes(role);

  if (!supplier) {
    return (
      <Screen title="Verificação" onBack={() => navigation.goBack()}>
        <Text style={styles.muted}>Fornecedor não encontrado.</Text>
      </Screen>
    );
  }

  const local = !result.summary;
  const localSummary = local ? summarize(supplier) : null;
  const overall = localSummary ? localSummary.overall : OVERALL_STATUS[supplier.status] || OVERALL_STATUS.atencao;
  const score = localSummary ? localSummary.score : supplier.score;
  const counts = localSummary
    ? { validos: localSummary.validos, vencendo: localSummary.vencendo, pendentes: localSummary.problemas }
    : supplier.counts;
  const alerts = localSummary
    ? localSummary.passport.filter((item) => item.status.key !== 'valido')
    : (supplier.alerts || []).map((item) => ({ ...item, key: item.label, status: DOC_STATUS[item.status] }));
  const verifiedAt = result.verifiedAt || new Date().toISOString();

  return (
    <Screen title="Resultado da verificação" subtitle={supplier.id} onBack={() => navigation.goBack()}>
      <View style={[styles.seal, { backgroundColor: overall.soft, borderColor: overall.color }]}>
        <Ionicons name={overall.icon} size={44} color={overall.color} />
        <Text style={[styles.sealTitle, { color: overall.color }]}>{overall.label}</Text>
        <Text style={styles.sealMessage}>{overall.message}</Text>
      </View>

      <Card style={styles.identityCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{supplier.name}</Text>
          <Text style={styles.meta}>CNPJ {supplier.cnpj}</Text>
          <Text style={styles.meta}>{supplier.category}</Text>
        </View>
        <ScoreGauge score={score} size={92} label={null} />
      </Card>

      <View style={styles.counters}>
        <Counter value={counts?.validos || 0} label="válidos" color={colors.green} />
        <Counter value={counts?.vencendo || 0} label="vencendo" color={colors.amber} />
        <Counter value={counts?.pendentes || 0} label="pendentes" color={colors.red} />
      </View>

      {alerts.length > 0 ? (
        <>
          <SectionTitle>O que impede ou limita a contratação</SectionTitle>
          <Card style={styles.alertCard}>
            {alerts.map((item, index) => (
              <View
                key={`${item.key}-${index}`}
                style={[styles.alertRow, index === alerts.length - 1 && { borderBottomWidth: 0 }]}
              >
                <Ionicons name={item.status.icon} size={16} color={item.status.color} />
                <Text style={styles.alertText}>
                  {item.label}
                  {item.required ? ' (obrigatório)' : ''}
                </Text>
                <Text style={[styles.alertStatus, { color: item.status.color }]}>{item.status.label}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <View style={styles.stamp}>
        <Ionicons name="time-outline" size={14} color={colors.textMuted} />
        <Text style={styles.stampText}>Verificado em {formatDateTime(verifiedAt)}</Text>
      </View>
      <View style={styles.stamp}>
        <Ionicons name="eye-off-outline" size={14} color={colors.textMuted} />
        <Text style={styles.stampText}>
          Esta consulta mostra apenas o status. Os arquivos não são expostos na verificação.
        </Text>
      </View>

      <View style={styles.actions}>
        {canViewPassport ? (
          <PrimaryButton
            label="Ver passaporte completo"
            icon="document-text-outline"
            onPress={() => navigation.navigate('SupplierPassport', { id: supplier.id })}
          />
        ) : null}
        <PrimaryButton
          label="Nova leitura"
          icon="qr-code-outline"
          variant="outline"
          onPress={() => navigation.goBack()}
          style={{ marginTop: canViewPassport ? spacing.md : 0 }}
        />
      </View>
    </Screen>
  );
}

function Counter({ value, label, color }) {
  return (
    <View style={styles.counter}>
      <Text style={[styles.counterValue, { color }]}>{value}</Text>
      <Text style={styles.counterLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted },
  seal: { alignItems: 'center', borderWidth: 2, borderRadius: radius.lg, padding: spacing.xl },
  sealTitle: { fontSize: 18, fontWeight: '700', marginTop: spacing.sm, textAlign: 'center' },
  sealMessage: { fontSize: 13, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  identityCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  counters: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingVertical: spacing.md, marginTop: spacing.md },
  counter: { alignItems: 'center' },
  counterValue: { fontSize: 20, fontWeight: '700' },
  counterLabel: { fontSize: 11, color: colors.textMuted },
  alertCard: { paddingVertical: 0 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  alertText: { flex: 1, fontSize: 13, color: colors.text },
  alertStatus: { fontSize: 11, fontWeight: '700' },
  stamp: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.md },
  stampText: { flex: 1, fontSize: 11, color: colors.textMuted, lineHeight: 16 },
  actions: { marginTop: spacing.xl },
});
