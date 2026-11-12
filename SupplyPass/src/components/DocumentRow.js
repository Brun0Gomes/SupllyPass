import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import StatusBadge from './StatusBadge';
import { colors, radius, spacing } from '../theme';
import { formatDate } from '../utils/dates';

function describe(item) {
  const { status, daysLeft, doc } = item;
  if (status.key === 'pendente') return 'Documento não enviado';
  if (status.key === 'vencido') {
    const days = Math.abs(daysLeft);
    return `Vencido há ${days} ${days === 1 ? 'dia' : 'dias'} · ${formatDate(doc.expiresAt)}`;
  }
  if (status.key === 'vencendo') {
    if (daysLeft === 0) return `Vence hoje · ${formatDate(doc.expiresAt)}`;
    return `Vence em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'} · ${formatDate(doc.expiresAt)}`;
  }
  return `Válido até ${formatDate(doc.expiresAt)}`;
}

export default function DocumentRow({ item, onPress, actionLabel, last }) {
  const content = (
    <>
      <View style={[styles.icon, { backgroundColor: item.status.soft }]}>
        <Ionicons name={item.icon} size={18} color={item.status.color} />
      </View>

      <View style={styles.middle}>
        <View style={styles.titleLine}>
          <Text style={styles.title} numberOfLines={1}>
            {item.label}
          </Text>
          {item.required ? <Text style={styles.required}>obrigatório</Text> : null}
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>
          {describe(item)}
        </Text>
        {item.doc && item.doc.file ? (
          <Text style={styles.file} numberOfLines={1}>
            {item.doc.file}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>
        <StatusBadge status={item.status} size="sm" text={item.status.label} />
        {actionLabel ? <Text style={styles.action}>{actionLabel}</Text> : null}
      </View>
    </>
  );

  const baseStyle = [styles.row, last ? styles.lastRow : null];

  if (!onPress) return <View style={baseStyle}>{content}</View>;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [...baseStyle, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastRow: { borderBottomWidth: 0 },
  pressed: { opacity: 0.6 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { flex: 1 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700', color: colors.text, flexShrink: 1 },
  required: {
    fontSize: 9,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  file: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  action: { fontSize: 11, color: colors.primary, fontWeight: '700' },
});
