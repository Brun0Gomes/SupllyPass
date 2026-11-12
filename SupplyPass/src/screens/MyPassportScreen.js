import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import PassportBody from '../components/PassportBody';
import Screen from '../components/Screen';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';
import { summarize } from '../utils/score';

export default function MyPassportScreen({ navigation }) {
  const { mySupplier, logout, refresh, loading, mode } = useApp();

  if (!mySupplier) {
    return (
      <Screen title="Meu passaporte" subtitle="Carregando...">
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      </Screen>
    );
  }

  const { problemas, vencendo } = summarize(mySupplier);
  const pendencias = problemas + vencendo;

  return (
    <Screen
      title="Meu passaporte"
      subtitle={mySupplier.name}
      right={
        <Pressable onPress={logout} hitSlop={12}>
          <Ionicons name="log-out-outline" size={22} color={colors.white} />
        </Pressable>
      }
      onRefresh={mode === 'api' ? refresh : undefined}
      refreshing={loading}
    >
      {pendencias > 0 ? (
        <Pressable
          onPress={() => navigation.navigate('Documentos')}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="alert-circle" size={22} color={colors.amber} />
          <View style={{ flex: 1 }}>
            <Text style={styles.ctaTitle}>
              {pendencias} {pendencias === 1 ? 'item precisa' : 'itens precisam'} da sua atenção
            </Text>
            <Text style={styles.ctaText}>
              Regularize agora para subir o seu score e continuar apto a contratos.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.amber} />
        </Pressable>
      ) : null}

      <PassportBody supplier={mySupplier} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.amberSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  ctaTitle: { fontSize: 13, fontWeight: '700', color: colors.amber },
  ctaText: { fontSize: 12, color: colors.amber, marginTop: 2 },
});
