import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

type Props<T extends string> = {
  options: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
  vertical?: boolean;
  fontSize?: number;
};

export function Segmented<T extends string>({ options, value, onChange, vertical, fontSize = 13 }: Props<T>) {
  return (
    <View style={[styles.row, vertical && { flexDirection: 'column' }]}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={[styles.item, on && styles.on]}
          >
            <Text style={[styles.label, { fontSize }, on && { color: colors.ink }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.panel,
    borderRadius: radius.pill,
    padding: 3,
    borderColor: colors.line,
    borderWidth: StyleSheet.hairlineWidth,
  },
  item: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, alignItems: 'center' },
  on: { backgroundColor: colors.amber },
  label: { color: colors.text, fontWeight: '700', letterSpacing: 0.4 },
});
