import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Screen from '../components/Screen';
import SupplierCard from '../components/SupplierCard';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';
import { getOverallStatus } from '../utils/score';

const FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'regular', label: '🟢 Regulares' },
  { key: 'atencao', label: '⚠️ Atenção' },
  { key: 'irregular', label: '❌ Irregulares' },
];

export default function SuppliersScreen({ navigation }) {
  const { suppliers } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('todos');

  const list = useMemo(() => {
    const term = query.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const matchesTerm =
        !term ||
        supplier.name.toLowerCase().includes(term) ||
        supplier.cnpj.includes(term) ||
        supplier.category.toLowerCase().includes(term);
      const matchesFilter = filter === 'todos' || getOverallStatus(supplier).key === filter;
      return matchesTerm && matchesFilter;
    });
  }, [suppliers, query, filter]);

  return (
    <Screen title="Fornecedores" subtitle={`${suppliers.length} cadastrados na base`} scroll={false}>
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.textLight} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nome, CNPJ ou categoria"
            placeholderTextColor={colors.textLight}
            style={styles.input}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={16} color={colors.textLight} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.chips}>
          {FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <SupplierCard
            supplier={item}
            onPress={() => navigation.navigate('SupplierPassport', { id: item.id })}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum fornecedor encontrado para esse filtro.</Text>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  input: { flex: 1, fontSize: 14, color: colors.text, padding: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl, fontSize: 13 },
});
