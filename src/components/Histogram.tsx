import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import type { HistData } from '../hooks/useHistogram';

export function Histogram({ data, width = 120, height = 52 }: { data: HistData | null; width?: number; height?: number }) {
  const bins = data?.bins ?? [];
  const max = Math.max(1, ...bins.map((b) => Math.sqrt(b))); // sqrt scale: tall spikes don't flatten the rest
  const bw = bins.length ? width / bins.length : 0;
  const hiWarn = (data?.clipHi ?? 0) > 0.02;
  const loWarn = (data?.clipLo ?? 0) > 0.05;
  return (
    <View style={[styles.box, { width: width + 12 }]} pointerEvents="none" accessible accessibilityLabel="Luminance histogram">
      <View style={{ width, height, flexDirection: 'row', alignItems: 'flex-end' }}>
        {bins.map((b, i) => (
          <View
            key={i}
            style={{
              width: bw,
              height: Math.max(1, (Math.sqrt(b) / max) * height),
              backgroundColor: i === bins.length - 1 && hiWarn ? colors.danger : i === 0 && loWarn ? colors.teal : colors.text,
              opacity: 0.85,
            }}
          />
        ))}
      </View>
      <View style={styles.row}>
        <Text style={[styles.tag, loWarn && { color: colors.teal }]}>{loWarn ? 'SHADOWS' : '0'}</Text>
        <Text style={[styles.tag, hiWarn && { color: colors.danger }]}>{hiWarn ? 'CLIPPING' : '255'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.panel, borderRadius: radius.sm, padding: 6, borderColor: colors.line, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  tag: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
});
