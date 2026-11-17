import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';

import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import Screen from '../components/Screen';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';

export default function MfaSetupScreen() {
  const { authChallenge, loadMfaSetup, confirmMfaSetup, cancelAuthChallenge } = useApp();
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadMfaSetup().then(setSetup).catch((error) => Alert.alert('Não foi possível preparar o MFA', error.message));
    // A leitura deve acontecer apenas ao abrir a tela; depois ela preenche o
    // próprio desafio com o segredo e não pode disparar uma nova chave.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirm = async () => {
    setBusy(true);
    try {
      await confirmMfaSetup(code);
    } catch (error) {
      Alert.alert('Código inválido', error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Proteja sua conta" subtitle="Autenticação em duas etapas" onBack={cancelAuthChallenge}>
      <View style={styles.hero}>
        <Ionicons name="shield-checkmark" size={38} color={colors.primary} />
        <Text style={styles.title}>MFA obrigatório</Text>
        <Text style={styles.text}>
          Para o perfil {authChallenge?.email}, conecte um aplicativo autenticador antes de continuar.
        </Text>
      </View>

      {!setup ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : (
        <>
          <Card style={styles.qrCard}>
            <QRCode value={setup.otpauthUrl} size={188} color={colors.text} backgroundColor={colors.white} />
            <Text style={styles.qrHint}>Escaneie no Google Authenticator, Microsoft Authenticator ou equivalente.</Text>
          </Card>
          <Card style={styles.secretCard}>
            <Text style={styles.secretLabel}>Não consegue escanear? Digite esta chave:</Text>
            <Text selectable style={styles.secret}>{setup.secret}</Text>
          </Card>
          <Text style={styles.label}>Código de 6 dígitos</Text>
          <TextInput
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={colors.textLight}
            style={styles.input}
          />
          <PrimaryButton label={busy ? 'Confirmando...' : 'Ativar MFA e entrar'} icon="key-outline" onPress={confirm} disabled={busy || code.length !== 6} style={{ marginTop: spacing.lg }} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.lg },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  text: { fontSize: 13, color: colors.textMuted, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  qrCard: { alignItems: 'center', padding: spacing.xl },
  qrHint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 17, marginTop: spacing.lg },
  secretCard: { backgroundColor: colors.primarySoft, borderColor: '#CFE0F5', marginTop: spacing.md },
  secretLabel: { fontSize: 12, color: colors.primaryDark },
  secret: { fontSize: 15, color: colors.primaryDark, fontWeight: '700', letterSpacing: 1, marginTop: 6, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, height: 52, fontSize: 22, letterSpacing: 8, textAlign: 'center', color: colors.text },
});
