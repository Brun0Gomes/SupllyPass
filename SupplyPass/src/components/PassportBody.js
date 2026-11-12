import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Card from './Card';
import DocumentRow from './DocumentRow';
import ScoreGauge from './ScoreGauge';
import SectionTitle from './SectionTitle';
import StatusBadge from './StatusBadge';
import { colors, radius, spacing } from '../theme';
import { summarize } from '../utils/score';

export default function PassportBody({ supplier, onPressDocument, actionLabel }) {
  const { passport, score, overall, validos, vencendo, problemas } = summarize(supplier);
  const obrigatorios = passport.filter((i) => i.required);
  const complementares = passport.filter((i) => !i.required);

  return (
    <View>
      <Card>
        <View style={styles.identityRow}>
          <View style={styles.identity}>
            <Text style={styles.name}>{supplier.name}</Text>
            <Text style={styles.meta}>CNPJ {supplier.cnpj}</Text>
            <Text style={styles.meta}>{supplier.category}</Text>
            <Text style={styles.meta}>
              {supplier.city} · fornecedor desde {supplier.since}
            </Text>
            <View style={styles.badgeWrap}>
              <StatusBadge status={overall} text={overall.short} />
            </View>
          </View>
          <ScoreGauge score={score} size={104} />
        </View>

        <View style={styles.divider} />

        <View style={styles.counters}>
          <Counter value={validos} label="válidos" color={colors.green} />
          <Counter value={vencendo} label="vencendo" color={colors.amber} />
          <Counter value={problemas} label="pendentes" color={colors.red} />
        </View>

        <View style={[styles.message, { backgroundColor: overall.soft }]}>
          <Ionicons name={overall.icon} size={16} color={overall.color} />
          <Text style={[styles.messageText, { color: overall.color }]}>{overall.message}</Text>
        </View>
      </Card>

      <SectionTitle hint="peso maior no score">Documentos obrigatórios</SectionTitle>
      <Card style={styles.listCard}>
        {obrigatorios.map((item, index) => (
          <DocumentRow
            key={item.key}
            item={item}
            last={index === obrigatorios.length - 1}
            actionLabel={actionLabel}
            onPress={onPressDocument ? () => onPressDocument(item) : undefined}
          />
        ))}
      </Card>

      <SectionTitle>Documentos complementares</SectionTitle>
      <Card style={styles.listCard}>
        {complementares.map((item, index) => (
          <DocumentRow
            key={item.key}
            item={item}
            last={index === complementares.length - 1}
            actionLabel={actionLabel}
            onPress={onPressDocument ? () => onPressDocument(item) : undefined}
          />
        ))}
      </Card>
    </View>
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
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identity: { flex: 1 },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badgeWrap: { marginTop: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  counters: { flexDirection: 'row', justifyContent: 'space-around' },
  counter: { alignItems: 'center' },
  counterValue: { fontSize: 20, fontWeight: '700' },
  counterLabel: { fontSize: 11, color: colors.textMuted },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  messageText: { fontSize: 12, fontWeight: '600', flex: 1 },
  listCard: { paddingVertical: 0 },
  lastRow: { borderBottomWidth: 0 },
});
