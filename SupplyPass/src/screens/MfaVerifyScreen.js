import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import PrimaryButton from '../components/PrimaryButton';
import Screen from '../components/Screen';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';

export default function MfaVerifyScreen() {
  const { authChallenge, verifyMfaLogin, cancelAuthChallenge } = useApp();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const verify = async () => {
    setBusy(true);
    try {
      await verifyMfaLogin(code);
    } catch (error) {
      Alert.alert('Código inválido', error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Confirme sua identidade" subtitle="Autenticação em duas etapas" onBack={cancelAuthChallenge}>
      <View style={styles.hero}>
        <Ionicons name="key-outline" size={42} color={colors.primary} />
        <Text style={styles.title}>Digite o código do autenticador</Text>
        <Text style={styles.text}>Use o código temporário de 6 dígitos da conta {authChallenge?.email}.</Text>
      </View>
      <TextInput
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
        placeholderTextColor={colors.textLight}
        style={styles.input}
        autoFocus
      />
      <PrimaryButton label={busy ? 'Verificando...' : 'Entrar com MFA'} icon="log-in-outline" onPress={verify} disabled={busy || code.length !== 6} style={{ marginTop: spacing.lg }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.xl },
  title: { fontSize: 19, fontWeight: '700', color: colors.text, marginTop: spacing.md, textAlign: 'center' },
  text: { fontSize: 13, color: colors.textMuted, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, height: 58, fontSize: 24, letterSpacing: 9, textAlign: 'center', color: colors.text },
});
