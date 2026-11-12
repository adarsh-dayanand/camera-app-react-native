import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { GridType } from '../hooks/useShootingSettings';

const LINE = 'rgba(255,255,255,0.4)';
const h = StyleSheet.hairlineWidth;

function vline(pct: number) {
  return <View key={`v${pct}`} style={{ position: 'absolute', left: `${pct}%`, top: 0, bottom: 0, width: h, backgroundColor: LINE }} />;
}
function hline(pct: number) {
  return <View key={`h${pct}`} style={{ position: 'absolute', top: `${pct}%`, left: 0, right: 0, height: h, backgroundColor: LINE }} />;
}

export function Grid({ type }: { type: GridType }) {
  if (type === 'off') return null;
  let lines: React.ReactNode[] = [];
  if (type === 'thirds') lines = [vline(33.33), vline(66.66), hline(33.33), hline(66.66)];
  if (type === 'golden') lines = [vline(38.2), vline(61.8), hline(38.2), hline(61.8)];
  if (type === 'cross') lines = [vline(50), hline(50)];
  if (type === 'diagonal') {
    // Two corner-to-corner diagonals drawn with rotated thin views.
    lines = [
      <View key="d1" style={[styles.diag, { transform: [{ rotate: '35deg' }] }]} />,
      <View key="d2" style={[styles.diag, { transform: [{ rotate: '-35deg' }] }]} />,
      vline(50),
    ];
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {lines}
    </View>
  );
}

const styles = StyleSheet.create({
  diag: { position: 'absolute', left: '-25%', right: '-25%', top: '50%', height: h, backgroundColor: LINE },
});
