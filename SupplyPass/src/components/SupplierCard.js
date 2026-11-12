import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import StatusBadge from './StatusBadge';
import { colors, radius, shadow, spacing } from '../theme';
import { scoreColor, summarize } from '../utils/score';

export default function SupplierCard({ supplier, onPress }) {
  const { score, overall, problemas, vencendo } = summarize(supplier);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.scoreBox, { borderColor: scoreColor(score) }]}>
        <Text style={[styles.score, { color: scoreColor(score) }]}>{score}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {supplier.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {supplier.category} · {supplier.cnpj}
        </Text>
        <View style={styles.badges}>
          <StatusBadge status={overall} size="sm" text={overall.short} />
          {problemas > 0 ? (
            <Text style={styles.alert}>
              {problemas} {problemas === 1 ? 'pendência' : 'pendências'}
            </Text>
          ) : null}
          {vencendo > 0 ? <Text style={styles.warn}>{vencendo} vencendo</Text> : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow,
  },
  pressed: { opacity: 0.7 },
  scoreBox: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: { fontSize: 16, fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  alert: { fontSize: 11, color: colors.red, fontWeight: '600' },
  warn: { fontSize: 11, color: colors.amber, fontWeight: '600' },
});
