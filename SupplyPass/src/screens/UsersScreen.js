import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import Screen from '../components/Screen';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';

const ROLES = [
  { key: 'administrador', label: 'Administrador' },
  { key: 'gestor', label: 'Gestor' },
  { key: 'analista', label: 'Analista' },
  { key: 'fornecedor', label: 'Fornecedor' },
  { key: 'verificador', label: 'Verificador' },
];

const emptyForm = {
  name: '',
  email: '',
  password: '',
  company: '',
  supplierId: '',
  role: 'gestor',
};

function roleLabel(role) {
  return ROLES.find((item) => item.key === role)?.label || role;
}

export default function UsersScreen() {
  const { users, suppliers, refresh, loading, createUser, updateUser, user: currentUser, logout } = useApp();
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const setField = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));

  const submit = async () => {
    setBusyId('new');
    try {
      await createUser({
        ...form,
        supplierId: form.supplierId || null,
      });
      setForm(emptyForm);
      setShowForm(false);
      Alert.alert('Usuário criado', 'A conta já pode entrar com a senha inicial definida.');
    } catch (error) {
      Alert.alert('Não foi possível criar o usuário', error.message);
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = async (entry, role) => {
    if (entry.role === role) return;
    setBusyId(entry.id);
    try {
      await updateUser(entry.id, { role, company: entry.company, supplierId: entry.supplierId });
    } catch (error) {
      Alert.alert('Não foi possível atualizar o perfil', error.message);
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (entry) => {
    const action = entry.active ? 'desativar' : 'reativar';
    Alert.alert(
      `${entry.active ? 'Desativar' : 'Reativar'} usuário`,
      `Deseja ${action} a conta de ${entry.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: entry.active ? 'Desativar' : 'Reativar',
          style: entry.active ? 'destructive' : 'default',
          onPress: async () => {
            setBusyId(entry.id);
            try {
              await updateUser(entry.id, {
                role: entry.role,
                company: entry.company,
                supplierId: entry.supplierId,
                active: !entry.active,
              });
            } catch (error) {
              Alert.alert('Não foi possível alterar a conta', error.message);
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <Screen
      title="Usuários e acessos"
      subtitle={`${users.filter((entry) => entry.active).length} contas ativas`}
      onRefresh={refresh}
      refreshing={loading}
      right={<Pressable onPress={logout} accessibilityLabel="Sair" hitSlop={12}><Ionicons name="log-out-outline" size={22} color={colors.white} /></Pressable>}
    >
      <Card style={styles.intro}>
        <Ionicons name="people-outline" size={20} color={colors.primaryDark} />
        <Text style={styles.introText}>
          Administradores criam contas, definem o perfil e interrompem imediatamente o acesso de
          usuários desativados.
        </Text>
      </Card>

      <PrimaryButton
        label={showForm ? 'Cancelar criação' : 'Novo usuário'}
        icon={showForm ? 'close-outline' : 'person-add-outline'}
        variant={showForm ? 'outline' : 'solid'}
        onPress={() => setShowForm((value) => !value)}
        style={{ marginTop: spacing.lg }}
      />

      {showForm ? (
        <Card style={styles.form}>
          <Text style={styles.formTitle}>Criar usuário</Text>
          <FormField label="Nome" value={form.name} onChangeText={(value) => setField('name', value)} />
          <FormField
            label="E-mail"
            value={form.email}
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={(value) => setField('email', value)}
          />
          <FormField
            label="Senha inicial (mínimo 10 caracteres)"
            value={form.password}
            secureTextEntry
            onChangeText={(value) => setField('password', value)}
          />
          <FormField label="Empresa" value={form.company} onChangeText={(value) => setField('company', value)} />

          <Text style={styles.label}>Perfil</Text>
          <RoleChips value={form.role} onChange={(value) => setField('role', value)} />

          {form.role === 'fornecedor' ? (
            <>
              <Text style={styles.label}>Fornecedor vinculado</Text>
              <View style={styles.chips}>
                {suppliers.map((supplier) => {
                  const active = form.supplierId === supplier.id;
                  return (
                    <Pressable
                      key={supplier.id}
                      onPress={() => setField('supplierId', supplier.id)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{supplier.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          <PrimaryButton
            label="Criar acesso"
            icon="checkmark-outline"
            onPress={submit}
            disabled={busyId === 'new'}
            style={{ marginTop: spacing.lg }}
          />
        </Card>
      ) : null}

      <Text style={styles.sectionTitle}>Contas cadastradas</Text>
      {users.map((entry) => {
        const disabled = busyId === entry.id;
        return (
          <Card key={entry.id} style={[styles.userCard, !entry.active && styles.userInactive]}>
            <View style={styles.userHeading}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{entry.name}</Text>
                <Text style={styles.email}>{entry.email}</Text>
              </View>
              <Text style={[styles.active, { color: entry.active ? colors.green : colors.red }]}>
                {entry.active ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
            <Text style={styles.company}>{entry.company || 'Sem empresa vinculada'}</Text>
            {entry.supplierId ? <Text style={styles.company}>Fornecedor: {entry.supplierId}</Text> : null}

            <Text style={styles.label}>Perfil: {roleLabel(entry.role)}</Text>
            <RoleChips value={entry.role} onChange={(role) => changeRole(entry, role)} disabled={disabled} compact />

            <PrimaryButton
              label={entry.active ? 'Desativar acesso' : 'Reativar acesso'}
              icon={entry.active ? 'person-remove-outline' : 'person-add-outline'}
              variant="outline"
              disabled={disabled || currentUser?.id === entry.id}
              onPress={() => toggleActive(entry)}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        );
      })}
    </Screen>
  );
}

function FormField({ label, value, onChangeText, ...props }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} style={styles.input} placeholderTextColor={colors.textLight} {...props} />
    </>
  );
}

function RoleChips({ value, onChange, disabled = false, compact = false }) {
  return (
    <View style={styles.chips}>
      {ROLES.map((role) => {
        const active = value === role.key;
        return (
          <Pressable
            key={role.key}
            disabled={disabled}
            onPress={() => onChange(role.key)}
            style={[styles.chip, compact && styles.chipCompact, active && styles.chipActive, disabled && styles.disabled]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{role.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.primarySoft, borderColor: '#CFE0F5' },
  introText: { flex: 1, fontSize: 12, color: colors.primaryDark, lineHeight: 17 },
  form: { marginTop: spacing.md },
  formTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  label: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginTop: spacing.md, marginBottom: 6 },
  input: { height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.text, backgroundColor: colors.bg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingVertical: 7, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  chipCompact: { paddingVertical: 5, paddingHorizontal: spacing.sm },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 11, color: colors.textMuted, fontWeight: '700' },
  chipTextActive: { color: colors.white },
  disabled: { opacity: 0.45 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.md },
  userCard: { marginBottom: spacing.md },
  userInactive: { opacity: 0.7 },
  userHeading: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  name: { fontSize: 14, fontWeight: '700', color: colors.text },
  email: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  active: { fontSize: 11, fontWeight: '700' },
  company: { fontSize: 12, color: colors.textMuted, marginTop: 5 },
});
