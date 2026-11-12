import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing } from '../theme';

export default function Screen({
  title,
  subtitle,
  onBack,
  right = null,
  children,
  scroll = true,
  variant = 'primary',
  contentStyle,
  onRefresh = null,
  refreshing = false,
}) {
  const isPrimary = variant === 'primary';
  const headerBg = isPrimary ? colors.primary : colors.card;
  const fg = isPrimary ? colors.white : colors.text;
  const subFg = isPrimary ? 'rgba(255,255,255,0.78)' : colors.textMuted;

  const header = (
    <SafeAreaView edges={['top']} style={{ backgroundColor: headerBg }}>
      <View style={[styles.header, { backgroundColor: headerBg }, !isPrimary && styles.headerBorder]}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={fg} />
          </Pressable>
        ) : null}
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: fg }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: subFg }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
    </SafeAreaView>
  );

  return (
    <View style={styles.root}>
      <StatusBar style={isPrimary ? 'light' : 'dark'} />
      {header}
      {scroll ? (
        <ScrollView
          style={styles.body}
          contentContainerStyle={[styles.content, contentStyle]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.body, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  headerText: { flex: 1 },
  title: { fontSize: 19, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  body: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
});
