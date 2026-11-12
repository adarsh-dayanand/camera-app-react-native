import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

type Props = { size: number; video?: boolean; recording?: boolean; busy?: boolean; onPress: () => void };

export function ShutterButton({ size, video, recording, busy, onPress }: Props) {
  const inner = recording ? size * 0.4 : size * 0.76;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={video ? (recording ? 'Stop recording' : 'Start recording') : 'Take photo'}
      onPress={onPress}
      disabled={busy}
      style={[styles.ring, { width: size, height: size, borderRadius: size / 2, opacity: busy ? 0.6 : 1 }]}
    >
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: recording ? 10 : inner / 2,
          backgroundColor: video ? colors.danger : colors.text,
        }}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: { borderWidth: 4, borderColor: colors.amber, alignItems: 'center', justifyContent: 'center' },
});
