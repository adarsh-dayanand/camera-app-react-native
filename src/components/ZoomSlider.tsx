import React, { useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

type Props = {
  /** 0..1 normalised zoom as expected by expo-camera */
  value: number;
  onChange: (v: number) => void;
  vertical?: boolean;
  length?: number;
};

/** Minimal drag slider (no gesture-handler dependency). */
export function ZoomSlider({ value, onChange, vertical, length = 220 }: Props) {
  const [trackLen, setTrackLen] = useState(length);
  const lenRef = useRef(length);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => update(e.nativeEvent),
      onPanResponderMove: (e) => update(e.nativeEvent),
    }),
  ).current;

  function update(ev: { locationX: number; locationY: number }) {
    const pos = vertical ? lenRef.current - ev.locationY : ev.locationX;
    onChangeRef.current(Math.max(0, Math.min(1, pos / lenRef.current)));
  }

  const onLayout = (e: LayoutChangeEvent) => {
    const l = vertical ? e.nativeEvent.layout.height : e.nativeEvent.layout.width;
    lenRef.current = l;
    setTrackLen(l);
  };

  const fill = value * trackLen;
  return (
    <View style={[styles.wrap, vertical ? { height: length, width: 36 } : { width: length, height: 36 }]}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Zoom"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
        onLayout={onLayout}
        {...pan.panHandlers}
        style={[styles.track, vertical ? styles.trackV : styles.trackH]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.fill,
            vertical ? { bottom: 0, left: 0, right: 0, height: fill } : { left: 0, top: 0, bottom: 0, width: fill },
          ]}
        />
        <View
          pointerEvents="none"
          style={[styles.thumb, vertical ? { bottom: fill - 10, alignSelf: 'center' } : { left: fill - 10, top: 8 }]}
        >
          <Text style={styles.thumbText}> </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center', alignItems: 'center' },
  track: { backgroundColor: colors.panel, borderRadius: 18, overflow: 'visible', borderColor: colors.line, borderWidth: StyleSheet.hairlineWidth },
  trackH: { width: '100%', height: 20 },
  trackV: { height: '100%', width: 20 },
  fill: { position: 'absolute', backgroundColor: colors.amber, borderRadius: 18, opacity: 0.85 },
  thumb: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: colors.text },
  thumbText: { fontSize: 1 },
});
