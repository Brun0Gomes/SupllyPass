import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import PrimaryButton from '../components/PrimaryButton';
import { useApp } from '../context/AppContext';
import { api, setBaseUrl } from '../api/client';
import { DEFAULT_API_URL } from '../config';
import { colors, radius, spacing } from '../theme';

const CONTAS = [
  { label: 'Contratante', email: 'compras@meridiano.com.br' },
  { label: 'Fornecedor', email: 'contato@novatech.com.br' },
];

export default function LoginScreen() {
  const { loginWithApi, startDemo } = useApp();

  const [email, setEmail] = useState(CONTAS[0].email);
  const [password, setPassword] = useState('');
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [showServer, setShowServer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const entrar = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await loginWithApi(email.trim(), password, apiUrl);
    } catch (error) {
      setStatus({ type: 'erro', text: error.message });
      setShowServer(true);
    } finally {
      setBusy(false);
    }
  };

  const testarConexao = async () => {
    setBusy(true);
    setStatus(null);
    setBaseUrl(apiUrl);
    try {
      const data = await api.health();
      setStatus({ type: 'ok', text: `Servidor respondeu: ${data.service} (${data.status}).` });
    } catch (error) {
      setStatus({ type: 'erro', text: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.brand}>
              <View style={styles.logo}>
                <Ionicons name="shield-checkmark" size={28} color={colors.white} />
              </View>
              <Text style={styles.appName}>SupplyPass</Text>
              <Text style={styles.tagline}>Passaporte digital de fornecedores</Text>
            </View>
          </SafeAreaView>

          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Entrar</Text>

            <Text style={styles.label}>E-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="voce@empresa.com.br"
              placeholderTextColor={colors.textLight}
              style={styles.input}
            />

            <Text style={styles.label}>Senha</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textLight}
              style={styles.input}
            />

            <View style={styles.quick}>
              {CONTAS.map((conta) => (
                <Pressable
                  key={conta.email}
                  onPress={() => {
                    setEmail(conta.email);
                    setPassword('');
                  }}
                  style={styles.quickChip}
                >
                  <Text style={styles.quickChipText}>{conta.label}</Text>
                </Pressable>
              ))}
            </View>

            <PrimaryButton
              label={busy ? 'Conectando...' : 'Entrar'}
              icon="log-in-outline"
              onPress={entrar}
              disabled={busy}
              style={{ marginTop: spacing.lg }}
            />

            <Pressable onPress={() => setShowServer((v) => !v)} style={styles.serverToggle}>
              <Ionicons
                name={showServer ? 'chevron-down' : 'chevron-forward'}
                size={14}
                color={colors.primary}
              />
              <Text style={styles.serverToggleText}>Configurar servidor</Text>
            </Pressable>

            {showServer ? (
              <View style={styles.serverBox}>
                <Text style={styles.serverHint}>
                  O celular não enxerga "localhost". Use o endereço de rede que o servidor imprime
                  no terminal ao iniciar.
                </Text>
                <TextInput
                  value={apiUrl}
                  onChangeText={setApiUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="http://192.168.0.15:3333/api"
                  placeholderTextColor={colors.textLight}
                  style={styles.input}
                />
                <PrimaryButton
                  label="Testar conexão"
                  icon="pulse-outline"
                  variant="outline"
                  onPress={testarConexao}
                  disabled={busy}
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            ) : null}

            {busy ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} /> : null}

            {status ? (
              <View
                style={[
                  styles.status,
                  { backgroundColor: status.type === 'ok' ? colors.greenSoft : colors.redSoft },
                ]}
              >
                <Ionicons
                  name={status.type === 'ok' ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={status.type === 'ok' ? colors.green : colors.red}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: status.type === 'ok' ? colors.green : colors.red },
                  ]}
                >
                  {status.text}
                </Text>
              </View>
            ) : null}

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.line} />
            </View>

            <Text style={styles.demoTitle}>Entrar sem servidor (dados de demonstração)</Text>
            <View style={styles.demoRow}>
              <PrimaryButton
                label="Contratante"
                icon="business-outline"
                variant="outline"
                onPress={() => startDemo('contratante')}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                label="Fornecedor"
                icon="briefcase-outline"
                variant="outline"
                onPress={() => startDemo('fornecedor')}
                style={{ flex: 1 }}
              />
            </View>
            <Text style={styles.demoHint}>
              O modo de demonstração roda tudo no próprio celular. Serve para apresentar o app sem
              depender da rede.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  scroll: { flexGrow: 1 },
  brand: { alignItems: 'center', paddingVertical: spacing.xl },
  logo: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  appName: { fontSize: 27, fontWeight: '700', color: colors.white, letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.82)', marginTop: 2 },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl + spacing.xl,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  label: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginTop: spacing.md },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
    fontSize: 14,
    color: colors.text,
    marginTop: 6,
  },
  quick: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  quickChip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  quickChipText: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  serverToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.lg },
  serverToggleText: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  serverBox: { marginTop: spacing.sm },
  serverHint: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  status: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  statusText: { flex: 1, fontSize: 12, lineHeight: 17 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xl },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, color: colors.textLight },
  demoTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  demoRow: { flexDirection: 'row', gap: spacing.md },
  demoHint: { fontSize: 11, color: colors.textMuted, marginTop: spacing.md, lineHeight: 16 },
});
