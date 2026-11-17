import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput } from 'react-native';
import PrimaryButton from '../components/PrimaryButton';
import Screen from '../components/Screen';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';

const fields = [
  { key: 'name', label: 'Razão social', placeholder: 'Nome do fornecedor' },
  { key: 'cnpj', label: 'CNPJ', placeholder: '14 dígitos', keyboardType: 'numeric' },
  { key: 'category', label: 'Categoria', placeholder: 'Ex.: Tecnologia' },
  { key: 'city', label: 'Cidade', placeholder: 'Ex.: São Paulo - SP' },
  { key: 'email', label: 'E-mail de contato', placeholder: 'contato@empresa.com.br', keyboardType: 'email-address' },
];

export default function CreateSupplierScreen({ navigation }) {
  const { createSupplier } = useApp();
  const [form, setForm] = useState({ name: '', cnpj: '', category: '', city: '', email: '' });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!form.name.trim() || form.cnpj.replace(/\D/g, '').length !== 14 || !form.category.trim()) {
      Alert.alert('Dados incompletos', 'Informe a razão social, o CNPJ e a categoria.');
      return;
    }
    setBusy(true);
    try {
      const supplier = await createSupplier(form);
      Alert.alert('Fornecedor cadastrado', 'Agora o administrador pode criar um usuário e vinculá-lo ao fornecedor.', [
        { text: 'OK', onPress: () => navigation.replace('SupplierPassport', { id: supplier.id }) },
      ]);
    } catch (error) {
      Alert.alert('Não foi possível cadastrar', error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen title="Novo fornecedor" subtitle="Cadastre os dados da empresa" onBack={() => navigation.goBack()}>
      {fields.map((field) => (
        <React.Fragment key={field.key}>
          <Text style={styles.label}>{field.label}</Text>
          <TextInput value={form[field.key]} onChangeText={(value) => setForm((current) => ({ ...current, [field.key]: value }))}
            placeholder={field.placeholder} placeholderTextColor={colors.textLight} keyboardType={field.keyboardType || 'default'}
            autoCapitalize={field.key === 'email' ? 'none' : 'sentences'} style={styles.input} />
        </React.Fragment>
      ))}
      <PrimaryButton label={busy ? 'Salvando...' : 'Cadastrar fornecedor'} onPress={submit} disabled={busy} style={styles.button} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 48, color: colors.text },
  button: { marginTop: spacing.xl },
});
