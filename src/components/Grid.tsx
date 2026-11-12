import React from 'react';
import { StyleSheet, View } from 'react-native';

export function Grid() {
  const line = { position: 'absolute' as const, backgroundColor: 'rgba(255,255,255,0.35)' };
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[line, { left: '33.33%', top: 0, bottom: 0, width: StyleSheet.hairlineWidth }]} />
      <View style={[line, { left: '66.66%', top: 0, bottom: 0, width: StyleSheet.hairlineWidth }]} />
      <View style={[line, { top: '33.33%', left: 0, right: 0, height: StyleSheet.hairlineWidth }]} />
      <View style={[line, { top: '66.66%', left: 0, right: 0, height: StyleSheet.hairlineWidth }]} />
    </View>
  );
}
