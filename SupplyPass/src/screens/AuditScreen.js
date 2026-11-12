import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Screen from '../components/Screen';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';
import { formatDateTime } from '../utils/dates';

const KIND = {
  verificacao: { icon: 'qr-code-outline', color: colors.primary, soft: colors.primarySoft },
  upload: { icon: 'cloud-upload-outline', color: colors.green, soft: colors.greenSoft },
  acesso: { icon: 'finger-print-outline', color: colors.amber, soft: colors.amberSoft },
};

export default function AuditScreen() {
  const { logs, refresh, loading, mode } = useApp();

  return (
    <Screen title="Trilha de auditoria" subtitle="Registros imutáveis de acesso e alteração" scroll={false}>
      <View style={styles.banner}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.primaryDark} />
        <Text style={styles.bannerText}>
          Todo acesso, envio e verificação gera um registro com autor, alvo, data e hora. Os registros
          não podem ser editados nem apagados pelos usuários.
        </Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={mode === 'api' ? loading : undefined}
        onRefresh={mode === 'api' ? refresh : undefined}
        renderItem={({ item }) => {
          const kind = KIND[item.kind] || KIND.acesso;
          return (
            <View style={styles.row}>
              <View style={[styles.icon, { backgroundColor: kind.soft }]}>
                <Ionicons name={kind.icon} size={16} color={kind.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.action}>{item.action}</Text>
                <Text style={styles.target} numberOfLines={1}>
                  {item.target}
                </Text>
                <Text style={styles.actor} numberOfLines={1}>
                  {item.actor}
                </Text>
              </View>
              <Text style={styles.time}>{formatDateTime(item.at)}</Text>
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.primarySoft,
    margin: spacing.lg,
    marginBottom: 0,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  bannerText: { flex: 1, fontSize: 12, color: colors.primaryDark, lineHeight: 17 },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: { fontSize: 13, fontWeight: '700', color: colors.text },
  target: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  actor: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  time: { fontSize: 10, color: colors.textLight, maxWidth: 78, textAlign: 'right' },
});
