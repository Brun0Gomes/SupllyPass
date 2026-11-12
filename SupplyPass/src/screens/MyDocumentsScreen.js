import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Card from '../components/Card';
import DocumentRow from '../components/DocumentRow';
import Screen from '../components/Screen';
import SectionTitle from '../components/SectionTitle';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';
import { getPassport } from '../utils/score';

export default function MyDocumentsScreen({ navigation }) {
  const { mySupplier, refresh, loading, mode } = useApp();

  if (!mySupplier) {
    return (
      <Screen title="Meus documentos" subtitle="Carregando...">
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      </Screen>
    );
  }

  const passport = getPassport(mySupplier);

  const pendentes = passport.filter((i) => i.status.key !== 'valido');
  const emDia = passport.filter((i) => i.status.key === 'valido');

  const open = (item) => navigation.navigate('AddDocument', { type: item.key });

  return (
    <Screen
      title="Meus documentos"
      subtitle="Toque em um item para enviar ou atualizar"
      onRefresh={mode === 'api' ? refresh : undefined}
      refreshing={loading}
    >
      <View style={styles.banner}>
        <Ionicons name="lock-closed-outline" size={16} color={colors.primaryDark} />
        <Text style={styles.bannerText}>
          Os arquivos são criptografados no envio e recebem uma assinatura digital com hash de
          integridade. A contratante vê o status, não o conteúdo.
        </Text>
      </View>

      <SectionTitle hint={`${pendentes.length} itens`}>Precisam de ação</SectionTitle>
      <Card style={styles.listCard}>
        {pendentes.length === 0 ? (
          <Text style={styles.empty}>Tudo em dia. Nenhum documento pendente ou vencendo.</Text>
        ) : (
          pendentes.map((item, index) => (
            <DocumentRow
              key={item.key}
              item={item}
              last={index === pendentes.length - 1}
              actionLabel={item.doc ? 'atualizar' : 'enviar'}
              onPress={() => open(item)}
            />
          ))
        )}
      </Card>

      <SectionTitle hint={`${emDia.length} itens`}>Em dia</SectionTitle>
      <Card style={styles.listCard}>
        {emDia.length === 0 ? (
          <Text style={styles.empty}>Nenhum documento válido no momento.</Text>
        ) : (
          emDia.map((item, index) => (
            <DocumentRow
              key={item.key}
              item={item}
              last={index === emDia.length - 1}
              actionLabel="substituir"
              onPress={() => open(item)}
            />
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  bannerText: { flex: 1, fontSize: 12, color: colors.primaryDark, lineHeight: 17 },
  listCard: { paddingVertical: 0 },
  empty: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
});
