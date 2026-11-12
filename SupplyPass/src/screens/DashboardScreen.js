import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Card from '../components/Card';
import KpiCard from '../components/KpiCard';
import Screen from '../components/Screen';
import SectionTitle from '../components/SectionTitle';
import SupplierCard from '../components/SupplierCard';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';
import { ALERT_WINDOW_DAYS, summarize } from '../utils/score';

export default function DashboardScreen({ navigation }) {
  const { suppliers, contratante, logout, refresh, loading, error, mode } = useApp();

  const data = useMemo(() => {
    const rows = suppliers.map((supplier) => ({ supplier, ...summarize(supplier) }));
    const regulares = rows.filter((r) => r.overall.key === 'regular').length;
    const irregulares = rows.filter((r) => r.overall.key === 'irregular');
    const atencao = rows.filter((r) => r.overall.key !== 'regular');

    const vencendo = [];
    rows.forEach(({ supplier, passport }) => {
      passport
        .filter((item) => item.status.key === 'vencendo')
        .forEach((item) => vencendo.push({ supplier, item }));
    });
    vencendo.sort((a, b) => a.item.daysLeft - b.item.daysLeft);

    return {
      total: rows.length,
      conformidade: rows.length ? Math.round((regulares / rows.length) * 100) : 0,
      irregulares: irregulares.length,
      vencendo,
      atencao: atencao.sort((a, b) => a.score - b.score),
    };
  }, [suppliers]);

  return (
    <Screen
      title="Painel de conformidade"
      subtitle={`${contratante.name} · ${contratante.unit}`}
      right={
        <Pressable onPress={logout} hitSlop={12}>
          <Ionicons name="log-out-outline" size={22} color={colors.white} />
        </Pressable>
      }
      onRefresh={mode === 'api' ? refresh : undefined}
      refreshing={loading}
    >
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.kpis}>
        <KpiCard value={data.total} label="Fornecedores ativos" icon="people-outline" />
        <KpiCard
          value={`${data.conformidade}%`}
          label="Totalmente regulares"
          icon="shield-checkmark-outline"
          color={colors.green}
          soft={colors.greenSoft}
        />
        <KpiCard
          value={data.vencendo.length}
          label={`Vencem em ${ALERT_WINDOW_DAYS} dias`}
          icon="time-outline"
          color={colors.amber}
          soft={colors.amberSoft}
        />
        <KpiCard
          value={data.irregulares}
          label="Contratação bloqueada"
          icon="close-circle-outline"
          color={colors.red}
          soft={colors.redSoft}
        />
      </View>

      <Pressable
        onPress={() => navigation.navigate('Verificar')}
        style={({ pressed }) => [styles.scanCta, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.scanIcon}>
          <Ionicons name="qr-code" size={24} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.scanTitle}>Verificar por QR Code</Text>
          <Text style={styles.scanText}>
            Antes de fechar contrato, escaneie o passaporte do fornecedor.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
      </Pressable>

      <SectionTitle hint={`${data.atencao.length} de ${data.total}`}>Precisam de atenção</SectionTitle>
      {data.atencao.length === 0 ? (
        <Card>
          <Text style={styles.empty}>Nenhum fornecedor com pendência. Base 100% regular.</Text>
        </Card>
      ) : (
        data.atencao.map(({ supplier }) => (
          <SupplierCard
            key={supplier.id}
            supplier={supplier}
            onPress={() => navigation.navigate('SupplierPassport', { id: supplier.id })}
          />
        ))
      )}

      <SectionTitle>Vencimentos próximos</SectionTitle>
      <Card style={styles.listCard}>
        {data.vencendo.length === 0 ? (
          <Text style={[styles.empty, { paddingVertical: spacing.lg }]}>
            Nenhum documento vence nos próximos {ALERT_WINDOW_DAYS} dias.
          </Text>
        ) : (
          data.vencendo.map(({ supplier, item }, index) => (
            <Pressable
              key={`${supplier.id}-${item.key}`}
              onPress={() => navigation.navigate('SupplierPassport', { id: supplier.id })}
              style={[styles.dueRow, index === data.vencendo.length - 1 && { borderBottomWidth: 0 }]}
            >
              <View style={styles.dueDays}>
                <Text style={styles.dueDaysValue}>{item.daysLeft}</Text>
                <Text style={styles.dueDaysLabel}>dias</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dueSupplier} numberOfLines={1}>
                  {supplier.name}
                </Text>
                <Text style={styles.dueDoc} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </Pressable>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.redSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  errorText: { flex: 1, fontSize: 12, color: colors.red, lineHeight: 17 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  scanCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryDark,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  scanIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTitle: { color: colors.white, fontSize: 15, fontWeight: '700' },
  scanText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  empty: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  listCard: { paddingVertical: 0 },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dueDays: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.amberSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueDaysValue: { fontSize: 16, fontWeight: '700', color: colors.amber },
  dueDaysLabel: { fontSize: 9, color: colors.amber, marginTop: -2 },
  dueSupplier: { fontSize: 14, fontWeight: '700', color: colors.text },
  dueDoc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
