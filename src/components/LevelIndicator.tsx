import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

/** Horizon line: turns green within ±1°. */
export function LevelIndicator({ degrees }: { degrees: number }) {
  const ok = Math.abs(degrees) < 1;
  const c = ok ? colors.teal : colors.amber;
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <View style={[styles.tick, { backgroundColor: c, opacity: 0.6 }]} />
      <View style={[styles.line, { backgroundColor: c, transform: [{ rotate: `${-degrees}deg` }] }]} />
      <View style={[styles.tick, { backgroundColor: c, opacity: 0.6 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, top: '50%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  line: { width: 110, height: 2, borderRadius: 1 },
  tick: { width: 26, height: 2, borderRadius: 1 },
});
