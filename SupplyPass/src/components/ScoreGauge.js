import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { colors } from '../theme';
import { scoreColor } from '../utils/score';

export default function ScoreGauge({ score, size = 112, stroke = 10, label = 'Supplier Score' }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = scoreColor(value);

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.border}
              strokeWidth={stroke}
              fill="none"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={circumference * (1 - value / 100)}
              fill="none"
            />
          </G>
        </Svg>
        <Text style={[styles.value, { color, fontSize: size * 0.29 }]}>{value}</Text>
        <Text style={styles.max}>de 100</Text>
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  value: { fontWeight: '700' },
  max: { fontSize: 11, color: colors.textLight, marginTop: -2 },
  label: { fontSize: 11, color: colors.textMuted, marginTop: 6, fontWeight: '600' },
});
