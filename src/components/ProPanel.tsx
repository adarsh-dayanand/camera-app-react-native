import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { Segmented } from './Segmented';
import { ZoomSlider } from './ZoomSlider';
import { WB_PRESETS, formatShutter, useManualControls } from '../hooks/useManualControls';

type Manual = ReturnType<typeof useManualControls>;
type Tab = 'exp' | 'focus' | 'wb' | 'fmt';
export type PhotoFormat = 'jpeg' | 'dng';

type Props = {
  m: Manual;
  format: PhotoFormat;
  onFormat: (f: PhotoFormat) => void;
  scale: number;
  maxWidth: number;
};

function Row({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
      {children}
    </View>
  );
}

/** Slider that stretches to the width it's given. */
function Wide({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [w, setW] = useState(240);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ alignSelf: 'stretch' }}>
      <ZoomSlider value={value} onChange={onChange} length={Math.max(120, w)} />
    </View>
  );
}

const Unsupported = () => <Text style={styles.note}>Not supported by this camera.</Text>;

export function ProPanel({ m, format, onFormat, scale, maxWidth }: Props) {
  const [tab, setTab] = useState<Tab>('exp');
  const L = m.limits;
  const fs = 12 * Math.max(1, scale);

  return (
    <View style={[styles.panel, { maxWidth }]}>
      <View style={styles.tabs}>
        <Segmented<Tab>
          options={[
            { key: 'exp', label: 'EXP' },
            { key: 'focus', label: 'FOCUS' },
            { key: 'wb', label: 'WB' },
            { key: 'fmt', label: 'FORMAT' },
          ]}
          value={tab}
          onChange={setTab}
          fontSize={fs}
        />
        {m.anyManual || m.ev !== 0 ? (
          <Pressable onPress={m.resetAll} accessibilityRole="button" accessibilityLabel="Reset all to auto" style={styles.reset}>
            <Text style={styles.resetText}>RESET</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView style={{ maxHeight: 190 * Math.max(1, scale) }} showsVerticalScrollIndicator={false}>
        {tab === 'exp' && (
          <View>
            <Segmented<'auto' | 'manual'>
              options={[{ key: 'auto', label: 'AUTO' }, { key: 'manual', label: 'MANUAL' }]}
              value={m.exposure}
              onChange={m.setExposure}
              fontSize={fs}
            />
            {m.exposure === 'auto' ? (
              L?.canEv ? (
                <Row label="Exposure comp." value={`${m.ev > 0 ? '+' : ''}${m.ev.toFixed(1)} EV`}>
                  <Wide
                    value={(m.ev - L.minEv) / (L.maxEv - L.minEv)}
                    onChange={(t) => m.setEv(Math.round((L.minEv + t * (L.maxEv - L.minEv)) * 10) / 10)}
                  />
                </Row>
              ) : (
                <Unsupported />
              )
            ) : L?.canExposure ? (
              <>
                <Row label="ISO" value={String(m.iso)}>
                  <Wide value={m.isoT} onChange={m.setIsoT} />
                </Row>
                <Row label="Shutter" value={formatShutter(m.shutter)}>
                  <Wide value={m.shutterT} onChange={m.setShutterT} />
                </Row>
              </>
            ) : (
              <Unsupported />
            )}
          </View>
        )}

        {tab === 'focus' && (
          <View>
            <Segmented<'auto' | 'manual'>
              options={[{ key: 'auto', label: 'AUTO' }, { key: 'manual', label: 'MANUAL' }]}
              value={m.focus}
              onChange={m.setFocus}
              fontSize={fs}
            />
            {m.focus === 'manual' ? (
              L?.canFocus ? (
                <Row label="Focus distance" value={m.lens < 0.05 ? 'Near' : m.lens > 0.95 ? 'Far ∞' : `${Math.round(m.lens * 100)}%`}>
                  <Wide value={m.lens} onChange={m.setLens} />
                </Row>
              ) : (
                <Unsupported />
              )
            ) : (
              <Text style={styles.note}>Continuous autofocus is on.</Text>
            )}
          </View>
        )}

        {tab === 'wb' && (
          <View>
            <View style={styles.chips}>
              {WB_PRESETS.map((p) => (
                <Pressable
                  key={p.key}
                  onPress={() => m.setWb(p.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: m.wb === p.key }}
                  style={[styles.chip, m.wb === p.key && styles.chipOn]}
                >
                  <Text style={[styles.chipText, { fontSize: fs - 1 }, m.wb === p.key && { color: colors.ink }]}>{p.label}</Text>
                </Pressable>
              ))}
            </View>
            {m.wb !== 'auto' && !L?.canWb ? <Unsupported /> : null}
            {m.wb === 'custom' && L?.canWb ? (
              <Row label="Temperature" value={`${m.kelvin} K`}>
                <Wide value={(m.kelvin - 2500) / 5500} onChange={(t) => m.setKelvin(Math.round((2500 + t * 5500) / 50) * 50)} />
              </Row>
            ) : null}
          </View>
        )}

        {tab === 'fmt' && (
          <View>
            <Segmented<PhotoFormat>
              options={[{ key: 'jpeg', label: 'JPEG' }, { key: 'dng', label: 'RAW · DNG' }]}
              value={format}
              onChange={onFormat}
              fontSize={fs}
            />
            <Text style={styles.note}>
              {format === 'dng'
                ? 'Saves an unprocessed Adobe DNG for editing in Lightroom, Snapseed, etc. Large files. If this device cannot shoot RAW, the app falls back to JPEG.'
                : 'Processed, compressed JPEG. Small files, ready to share.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignSelf: 'center',
    width: '100%',
    backgroundColor: 'rgba(14,15,18,0.86)',
    borderRadius: radius.lg,
    padding: 12,
    borderColor: colors.line,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabs: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  reset: { paddingHorizontal: 10, paddingVertical: 6 },
  resetText: { color: colors.teal, fontWeight: '800', fontSize: 12, letterSpacing: 0.6 },
  row: { marginTop: 10 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  rowLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  rowValue: { color: colors.amber, fontWeight: '800', fontVariant: ['tabular-nums'] },
  note: { color: colors.muted, fontSize: 12, marginTop: 10, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.panel, borderColor: colors.line, borderWidth: StyleSheet.hairlineWidth },
  chipOn: { backgroundColor: colors.amber },
  chipText: { color: colors.text, fontWeight: '800', letterSpacing: 0.4 },
});
