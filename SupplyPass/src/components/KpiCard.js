import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, shadow, spacing } from '../theme';

export default function KpiCard({ value, label, icon, color = colors.primary, soft = colors.primarySoft }) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: soft }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadow,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  value: { fontSize: 24, fontWeight: '700' },
  label: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
