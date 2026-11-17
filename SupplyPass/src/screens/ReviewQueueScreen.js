import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Screen from '../components/Screen';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';
import { formatDate, formatDateTime } from '../utils/dates';
import { DOC_STATUS } from '../utils/score';

export default function ReviewQueueScreen({ navigation }) {
  const { reviews, refresh, loading, mode, logout } = useApp();

  return (
    <Screen title="Fila de análises" subtitle={`${reviews.length} documento${reviews.length === 1 ? '' : 's'} aguardando`} scroll={false}
      right={<Pressable onPress={logout} accessibilityLabel="Sair" hitSlop={12}><Ionicons name="log-out-outline" size={22} color={colors.white} /></Pressable>}>
      <View style={styles.banner}>
        <Ionicons name="shield-checkmark-outline" size={17} color={colors.primaryDark} />
        <Text style={styles.bannerText}>
          Aprove quando o documento estiver correto. Ao reprovar, explique o que o fornecedor precisa corrigir.
        </Text>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, reviews.length === 0 && styles.emptyList]}
        refreshing={mode === 'api' ? loading : false}
        onRefresh={mode === 'api' ? refresh : undefined}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('ReviewDocument', { reviewId: item.id })}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.icon}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.info}>
              <View style={styles.titleLine}>
                <Text style={styles.title} numberOfLines={1}>{item.label}</Text>
                <StatusBadge status={DOC_STATUS.em_analise} size="sm" />
              </View>
              <Text style={styles.supplier} numberOfLines={1}>{item.supplierName}</Text>
              <Text style={styles.meta} numberOfLines={1}>{item.fileName}</Text>
              <Text style={styles.meta}>
                Enviado {formatDateTime(item.uploadedAt)} · válido até {formatDate(item.expiresAt)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={38} color={colors.green} />
            <Text style={styles.emptyTitle}>Fila em dia</Text>
            <Text style={styles.emptyText}>Não há documentos aguardando a sua análise.</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', backgroundColor: colors.primarySoft,
    padding: spacing.md, margin: spacing.lg, marginBottom: 0, borderRadius: radius.md,
  },
  bannerText: { flex: 1, color: colors.primaryDark, fontSize: 12, lineHeight: 17 },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.7 },
  icon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  supplier: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 3 },
  meta: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  empty: { alignItems: 'center', padding: spacing.xxl },
  emptyTitle: { marginTop: spacing.md, fontSize: 16, fontWeight: '700', color: colors.text },
  emptyText: { marginTop: 4, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
