import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { api, getBaseUrl, setBaseUrl } from '../api/client';
import { DEFAULT_API_URL } from '../config';
import { colors, radius, spacing } from '../theme';

export default function LoginScreen() {
  const { loginWithApi, error: sessionError } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [apiUrl, setApiUrl] = useState(getBaseUrl() || DEFAULT_API_URL);
  const [showServer, setShowServer] = useState(!(getBaseUrl() || DEFAULT_API_URL));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(sessionError ? { type: 'erro', text: sessionError } : null);

  const forgotPassword = () => Alert.alert(
    'Recuperação de senha — demonstração',
    'Esta função é uma demonstração: nenhum e-mail será enviado e a senha não será alterada. Para ajuda com o acesso, procure o administrador.'
  );

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
              <View style={styles.logoPanel}>
                <Image source={require('../../assets/supplypass-logo.png')} style={styles.logoImage} resizeMode="contain" accessibilityLabel="Supply Pass" />
              </View>
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
            <View style={styles.passwordContainer}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="••••••••"
                placeholderTextColor={colors.textLight}
                style={[styles.input, styles.passwordInput]}
              />
              <Pressable onPress={() => setShowPassword((value) => !value)} style={styles.eyeButton}
                accessibilityRole="button" accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <Pressable onPress={forgotPassword} accessibilityRole="button" style={styles.forgotButton}>
              <Text style={styles.serverToggleText}>Esqueceu a senha?</Text>
            </Pressable>

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
                  placeholder="https://api.suaempresa.com/api"
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
  logoPanel: {
    width: 260,
    height: 164,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoImage: { width: 250, height: 160 },
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
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 52 },
  eyeButton: { position: 'absolute', right: 0, top: 6, height: 46, width: 48, alignItems: 'center', justifyContent: 'center' },
  forgotButton: { alignSelf: 'flex-end', paddingVertical: spacing.sm },
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
