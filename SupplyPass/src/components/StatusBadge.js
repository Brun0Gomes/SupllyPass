import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { radius, spacing } from '../theme';

export default function StatusBadge({ status, size = 'md', text }) {
  const small = size === 'sm';
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: status.soft },
        small && { paddingVertical: 3, paddingHorizontal: spacing.sm },
      ]}
    >
      <Ionicons name={status.icon} size={small ? 12 : 14} color={status.color} />
      <Text style={[styles.text, { color: status.color, fontSize: small ? 11 : 12 }]}>
        {text || status.short || status.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  text: { fontWeight: '700' },
});
