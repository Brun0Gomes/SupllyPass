import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import Screen from '../components/Screen';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';
import { formatDate, isoFromToday, parseBrDate } from '../utils/dates';
import { DOC_TYPES } from '../utils/score';

const PRESETS = [
  { label: '6 meses', days: 182 },
  { label: '1 ano', days: 365 },
  { label: '2 anos', days: 730 },
];

export default function AddDocumentScreen({ route, navigation }) {
  const { mySupplier, uploadDocument, mode } = useApp();
  const [type, setType] = useState(route.params?.type || DOC_TYPES[0].key);
  const [file, setFile] = useState(null);
  const [validade, setValidade] = useState(formatDate(isoFromToday(365)));
  const [busy, setBusy] = useState(false);

  const current = useMemo(
    () => ((mySupplier && mySupplier.documents) || []).find((d) => d.type === type) || null,
    [mySupplier, type]
  );

  const escolherArquivo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/png', 'image/jpeg'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setFile({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || 'application/pdf',
        size: asset.size,
      });
    } catch (error) {
      Alert.alert('Não foi possível abrir os arquivos', error.message);
    }
  };

  const submit = async () => {
    const expiresAt = parseBrDate(validade);
    if (!expiresAt) {
      Alert.alert('Data inválida', 'Informe a validade no formato DD/MM/AAAA.');
      return;
    }
    if (mode === 'api' && !file) {
      Alert.alert('Selecione o arquivo', 'No modo conectado o arquivo é enviado de verdade ao servidor.');
      return;
    }

    setBusy(true);
    try {
      const result = await uploadDocument({ type, file, expiresAt });
      Alert.alert(
        'Documento enviado',
        `${result.fileName}\n\nCriptografado com AES-256-GCM e assinado digitalmente.\n\n` +
          `Hash SHA-256${result.real ? '' : ' (simulado)'}:\n${result.hash.slice(0, 32)}…\n\n` +
          `Validade até ${formatDate(expiresAt)}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Falha no envio', error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="Enviar documento"
      subtitle={mySupplier ? mySupplier.name : ''}
      onBack={() => navigation.goBack()}
      scroll={false}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Tipo de documento</Text>
          <View style={styles.chips}>
            {DOC_TYPES.map((docType) => {
              const active = docType.key === type;
              return (
                <Pressable
                  key={docType.key}
                  onPress={() => setType(docType.key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {docType.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {current ? (
            <View style={styles.currentBox}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primaryDark} />
              <Text style={styles.currentText}>
                Já existe um arquivo enviado ({current.file}, válido até {formatDate(current.expiresAt)}).
                O envio abaixo substitui a versão vigente; a anterior continua no histórico.
              </Text>
            </View>
          ) : null}

          <Text style={styles.label}>Arquivo</Text>
          <Pressable style={styles.filePicker} onPress={escolherArquivo}>
            <Ionicons
              name={file ? 'document-attach' : 'cloud-upload-outline'}
              size={20}
              color={colors.primary}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.filePickerText}>
                {file ? file.name : 'Toque para escolher um PDF ou imagem'}
              </Text>
              {file && file.size ? (
                <Text style={styles.fileMeta}>{Math.round(file.size / 1024)} KB · {file.mimeType}</Text>
              ) : null}
            </View>
            {file ? (
              <Pressable onPress={() => setFile(null)} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color={colors.textLight} />
              </Pressable>
            ) : null}
          </Pressable>
          {mode !== 'api' ? (
            <Text style={styles.demoNote}>
              No modo de demonstração o arquivo é opcional: o envio é simulado no próprio celular.
            </Text>
          ) : null}

          <Text style={styles.label}>Validade</Text>
          <TextInput
            value={validade}
            onChangeText={setValidade}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={colors.textLight}
            keyboardType="numbers-and-punctuation"
            style={styles.input}
          />
          <View style={styles.chips}>
            {PRESETS.map((preset) => (
              <Pressable
                key={preset.label}
                onPress={() => setValidade(formatDate(isoFromToday(preset.days)))}
                style={styles.chip}
              >
                <Text style={styles.chipText}>+ {preset.label}</Text>
              </Pressable>
            ))}
          </View>

          <Card style={styles.securityCard}>
            <Text style={styles.securityTitle}>O que acontece ao enviar</Text>
            {[
              'O servidor calcula o hash SHA-256 do arquivo original.',
              'O conteúdo é criptografado com AES-256-GCM antes de ir para o disco.',
              'A versão anterior do mesmo tipo é marcada como substituída, não apagada.',
              'A ação entra na trilha de auditoria e não pode ser removida.',
            ].map((line) => (
              <View key={line} style={styles.securityLine}>
                <Ionicons name="checkmark-circle" size={14} color={colors.green} />
                <Text style={styles.securityText}>{line}</Text>
              </View>
            ))}
          </Card>

          <PrimaryButton
            label={busy ? 'Enviando...' : 'Enviar documento'}
            icon="shield-checkmark-outline"
            onPress={submit}
            disabled={busy}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  currentBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  currentText: { flex: 1, fontSize: 12, color: colors.primaryDark, lineHeight: 17 },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  filePickerText: { fontSize: 13, color: colors.textMuted },
  fileMeta: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  demoNote: { fontSize: 11, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 16 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  securityCard: { marginTop: spacing.xl, marginBottom: spacing.lg },
  securityTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  securityLine: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: 6 },
  securityText: { flex: 1, fontSize: 12, color: colors.textMuted, lineHeight: 17 },
});
