import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import Screen from '../components/Screen';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';

export default function ScanScreen({ navigation }) {
  const { suppliers, verifyCode } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState('');
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) setScanned(false);
  }, [isFocused]);

  // No modo conectado quem valida o código é o servidor; no modo de
  // demonstração a busca acontece na lista carregada no próprio app.
  const verify = async (raw) => {
    setBusy(true);
    try {
      const id = await verifyCode(raw);
      navigation.navigate('VerifyResult', { id });
    } catch (error) {
      Alert.alert('Código não reconhecido', error.message, [
        { text: 'Tentar de novo', onPress: () => setScanned(false) },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handleBarcode = ({ data }) => {
    if (scanned || busy) return;
    setScanned(true);
    verify(data);
  };

  const submitManual = () => {
    if (!manual.trim()) return;
    verify(manual);
    setManual('');
  };

  return (
    <Screen title="Verificar fornecedor" subtitle="Leia o QR Code do passaporte">
      {permission && permission.granted ? (
        <View style={styles.cameraWrap}>
          {isFocused ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned ? undefined : handleBarcode}
            />
          ) : null}
          <View style={styles.frame} pointerEvents="none" />
          <Text style={styles.cameraHint}>Aponte para o QR Code do fornecedor</Text>
        </View>
      ) : (
        <Card style={styles.permissionCard}>
          <Ionicons name="camera-outline" size={28} color={colors.primary} />
          <Text style={styles.permissionTitle}>Liberar a câmera</Text>
          <Text style={styles.permissionText}>
            A câmera é usada apenas para ler o QR Code do passaporte. Nenhuma imagem é armazenada.
          </Text>
          <PrimaryButton
            label="Permitir acesso à câmera"
            icon="camera"
            onPress={requestPermission}
            style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
          />
        </Card>
      )}

      <Card style={styles.manualCard}>
        <Text style={styles.manualTitle}>Ou digite o código do fornecedor</Text>
        <View style={styles.manualRow}>
          <TextInput
            value={manual}
            onChangeText={setManual}
            placeholder="Ex.: FOR-1042"
            placeholderTextColor={colors.textLight}
            autoCapitalize="characters"
            style={styles.input}
            onSubmitEditing={submitManual}
          />
          <Pressable onPress={submitManual} disabled={busy} style={styles.goBtn}>
            <Ionicons name="arrow-forward" size={20} color={colors.white} />
          </Pressable>
        </View>

        <Text style={styles.demoLabel}>Códigos da demonstração</Text>
        <View style={styles.demoChips}>
          {suppliers.slice(0, 4).map((supplier) => (
            <Pressable key={supplier.id} onPress={() => verify(supplier.id)} style={styles.demoChip}>
              <Text style={styles.demoChipText}>{supplier.id}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <View style={styles.note}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.primaryDark} />
        <Text style={styles.noteText}>
          Toda verificação é registrada na trilha de auditoria com o responsável, a data e a hora.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraWrap: {
    height: 300,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#0B1220',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 190,
    height: 190,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.lg,
  },
  cameraHint: {
    position: 'absolute',
    bottom: spacing.lg,
    color: colors.white,
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  permissionCard: { alignItems: 'center' },
  permissionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  permissionText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  manualCard: { marginTop: spacing.lg },
  manualTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  manualRow: { flexDirection: 'row', gap: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
    fontSize: 14,
    color: colors.text,
  },
  goBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoLabel: { fontSize: 11, color: colors.textLight, marginTop: spacing.lg, marginBottom: 6 },
  demoChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  demoChip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  demoChipText: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    padding: spacing.md,
    marginTop: spacing.md,
  },
  noteText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },
});
