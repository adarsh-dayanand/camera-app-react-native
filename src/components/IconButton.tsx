import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

type Props = {
  label: string;
  glyph: string;
  active?: boolean;
  size?: number;
  onPress: () => void;
  badge?: string;
};

export function IconButton({ label, glyph, active, size = 44, onPress, badge }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.btn,
        { width: size, height: size, borderRadius: size / 2 },
        active && styles.active,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.glyph, { fontSize: size * 0.42 }, active && { color: colors.ink }]}>{glyph}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { backgroundColor: colors.amber },
  glyph: { color: colors.text, fontWeight: '700' },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingHorizontal: 5,
    minWidth: 16,
    alignItems: 'center',
  },
  badgeText: { color: colors.ink, fontSize: 10, fontWeight: '800' },
});
