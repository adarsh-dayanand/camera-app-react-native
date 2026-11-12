import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { Segmented } from './Segmented';
import { ZoomSlider } from './ZoomSlider';
import { WB_PRESETS, formatShutter, useManualControls } from '../hooks/useManualControls';
import type { Lens, Settings } from '../hooks/useShootingSettings';

type Manual = ReturnType<typeof useManualControls>;
type Tab = 'exp' | 'focus' | 'wb' | 'photo' | 'drive' | 'video' | 'view';

export type Caps = {
  lenses: Lens[];
  hdr: boolean;
  codecs: ('h264' | 'h265')[];
};

type Props = {
  m: Manual;
  s: Settings;
  set: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  caps: Caps;
  scale: number;
  maxWidth: number;
};

const TABS: { key: Tab; label: string }[] = [
  { key: 'exp', label: 'EXP' },
  { key: 'focus', label: 'FOCUS' },
  { key: 'wb', label: 'WB' },
  { key: 'photo', label: 'PHOTO' },
  { key: 'drive', label: 'DRIVE' },
  { key: 'video', label: 'VIDEO' },
  { key: 'view', label: 'VIEW' },
];

const LENS_LABEL: Record<Lens, string> = { auto: 'AUTO', 'ultra-wide-angle': 'ULTRA-WIDE', 'wide-angle': 'WIDE', telephoto: 'TELE' };

function Row({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <Text style={styles.rowLabel}>{label}</Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Wide({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [w, setW] = useState(240);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ alignSelf: 'stretch' }}>
      <ZoomSlider value={value} onChange={onChange} length={Math.max(120, w)} />
    </View>
  );
}

function Toggle({ label, on, onChange, hint }: { label: string; on: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <Pressable onPress={() => onChange(!on)} accessibilityRole="switch" accessibilityState={{ checked: on }} style={styles.toggle}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={[styles.sw, on && { backgroundColor: colors.amber }]}>
        <View style={[styles.knob, on && { alignSelf: 'flex-end' }]} />
      </View>
    </Pressable>
  );
}

const Unsupported = () => <Text style={styles.note}>Not supported by this camera.</Text>;

export function ProPanel({ m, s, set, caps, scale, maxWidth }: Props) {
  const [tab, setTab] = useState<Tab>('exp');
  const L = m.limits;
  const fs = 12 * Math.max(1, scale);
  const AutoManual = ({ v, on }: { v: 'auto' | 'manual'; on: (x: 'auto' | 'manual') => void }) => (
    <Segmented<'auto' | 'manual'> options={[{ key: 'auto', label: 'AUTO' }, { key: 'manual', label: 'MANUAL' }]} value={v} onChange={on} fontSize={fs} />
  );

  return (
    <View style={[styles.panel, { maxWidth }]}>
      <View style={styles.tabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingRight: 8 }}>
          <Segmented<Tab> options={TABS} value={tab} onChange={setTab} fontSize={fs - 1} />
        </ScrollView>
        {m.anyManual || m.ev !== 0 ? (
          <Pressable onPress={m.resetAll} accessibilityRole="button" accessibilityLabel="Reset all to auto" style={styles.reset}>
            <Text style={styles.resetText}>RESET</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView style={{ maxHeight: 210 * Math.max(1, scale) }} showsVerticalScrollIndicator={false}>
        {tab === 'exp' && (
          <View>
            <AutoManual v={m.exposure} on={m.setExposure} />
            {m.exposure === 'auto' ? (
              L?.canEv ? (
                <Row label="Exposure comp." value={`${m.ev > 0 ? '+' : ''}${m.ev.toFixed(1)} EV`}>
                  <Wide value={(m.ev - L.minEv) / (L.maxEv - L.minEv)} onChange={(t) => m.setEv(Math.round((L.minEv + t * (L.maxEv - L.minEv)) * 10) / 10)} />
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
            <Toggle label="AE / AF lock" on={m.aeafLock} onChange={m.setAeafLock} hint="Freeze the current auto exposure and focus" />
          </View>
        )}

        {tab === 'focus' && (
          <View>
            <AutoManual v={m.focus} on={m.setFocus} />
            {m.focus === 'manual' ? (
              L?.canFocus ? (
                <Row label="Focus distance" value={m.lens < 0.05 ? 'Near' : m.lens > 0.95 ? 'Far ∞' : `${Math.round(m.lens * 100)}%`}>
                  <Wide value={m.lens} onChange={m.setLens} />
                </Row>
              ) : (
                <Unsupported />
              )
            ) : (
              <Text style={styles.note}>Continuous autofocus is on. Tap the preview to focus on a point.</Text>
            )}
          </View>
        )}

        {tab === 'wb' && (
          <View>
            <View style={styles.chips}>
              {WB_PRESETS.map((p) => (
                <Pressable key={p.key} onPress={() => m.setWb(p.key)} accessibilityRole="button" accessibilityState={{ selected: m.wb === p.key }} style={[styles.chip, m.wb === p.key && styles.chipOn]}>
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

        {tab === 'photo' && (
          <View>
            <Row label="File format">
              <Segmented<Settings['format']> options={[{ key: 'jpeg', label: 'JPEG' }, { key: 'heic', label: 'HEIC' }, { key: 'dng', label: 'RAW·DNG' }]} value={s.format} onChange={(v) => set('format', v)} fontSize={fs} />
            </Row>
            <Text style={styles.note}>
              {s.format === 'dng' ? 'Unprocessed DNG for editing in Lightroom/Snapseed. Large files.' : s.format === 'heic' ? 'Smaller files at the same quality (iOS / newer Android).' : 'Universal and ready to share.'} If the device can't shoot it, the app falls back to JPEG.
            </Text>
            <Row label="Processing priority">
              <Segmented<Settings['priority']> options={[{ key: 'speed', label: 'SPEED' }, { key: 'balanced', label: 'BALANCED' }, { key: 'quality', label: 'QUALITY' }]} value={s.priority} onChange={(v) => set('priority', v)} fontSize={fs} />
            </Row>
            <Toggle label="HDR photo" on={s.hdr && caps.hdr} onChange={(v) => caps.hdr && set('hdr', v)} hint={caps.hdr ? 'Fuses several exposures for more range' : 'Not supported by this camera'} />
            <Toggle label="Shutter sound" on={s.shutterSound} onChange={(v) => set('shutterSound', v)} />
          </View>
        )}

        {tab === 'drive' && (
          <View>
            <Row label="Drive mode">
              <Segmented<Settings['drive']> options={[{ key: 'single', label: 'SINGLE' }, { key: 'burst', label: 'BURST' }, { key: 'bracket', label: 'BRACKET' }]} value={s.drive} onChange={(v) => set('drive', v)} fontSize={fs} />
            </Row>
            {s.drive === 'burst' && (
              <Row label="Burst length">
                <Segmented<`${3 | 5 | 10}`> options={[{ key: '3', label: '3' }, { key: '5', label: '5' }, { key: '10', label: '10' }]} value={`${s.burstCount}` as `${3 | 5 | 10}`} onChange={(v) => set('burstCount', Number(v) as 3 | 5 | 10)} fontSize={fs} />
              </Row>
            )}
            {s.drive === 'bracket' && (
              <>
                <Row label="Bracket step">
                  <Segmented<`${1 | 2}`> options={[{ key: '1', label: '±1 EV' }, { key: '2', label: '±2 EV' }]} value={`${s.bracketStep}` as `${1 | 2}`} onChange={(v) => set('bracketStep', Number(v) as 1 | 2)} fontSize={fs} />
                </Row>
                <Text style={styles.note}>Shoots 3 frames (under / normal / over) for HDR merging. In manual exposure the shutter speed is varied instead.</Text>
              </>
            )}
            {s.drive === 'single' && <Text style={styles.note}>Use the clock button above for a 3s / 10s self-timer.</Text>}
          </View>
        )}

        {tab === 'video' && (
          <View>
            <Row label="Resolution">
              <Segmented<Settings['videoRes']> options={[{ key: '720', label: '720p' }, { key: '1080', label: '1080p' }, { key: '2160', label: '4K' }]} value={s.videoRes} onChange={(v) => set('videoRes', v)} fontSize={fs} />
            </Row>
            <Row label="Frame rate">
              <Segmented<`${24 | 30 | 60}`> options={[{ key: '24', label: '24' }, { key: '30', label: '30' }, { key: '60', label: '60' }]} value={`${s.fps}` as `${24 | 30 | 60}`} onChange={(v) => set('fps', Number(v) as 24 | 30 | 60)} fontSize={fs} />
            </Row>
            <Row label="Stabilization">
              <Segmented<Settings['stab']> options={[{ key: 'off', label: 'OFF' }, { key: 'auto', label: 'AUTO' }, { key: 'cinematic', label: 'CINEMATIC' }]} value={s.stab} onChange={(v) => set('stab', v)} fontSize={fs} />
            </Row>
            <Row label="Codec">
              <Segmented<Settings['codec']> options={[{ key: 'h264', label: 'H.264' }, { key: 'h265', label: 'HEVC' }]} value={caps.codecs.includes(s.codec) ? s.codec : 'h264'} onChange={(v) => caps.codecs.includes(v) && set('codec', v)} fontSize={fs} />
            </Row>
            <Text style={styles.note}>Unsupported combinations (e.g. 4K at 60 fps) are adjusted automatically by the camera.</Text>
          </View>
        )}

        {tab === 'view' && (
          <View>
            <Row label="Lens">
              <View style={styles.chips}>
                {caps.lenses.map((l) => (
                  <Pressable key={l} onPress={() => set('lens', l)} accessibilityRole="button" accessibilityState={{ selected: s.lens === l }} style={[styles.chip, s.lens === l && styles.chipOn]}>
                    <Text style={[styles.chipText, { fontSize: fs - 1 }, s.lens === l && { color: colors.ink }]}>{LENS_LABEL[l]}</Text>
                  </Pressable>
                ))}
              </View>
            </Row>
            <Row label="Composition grid">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Segmented<Settings['grid']> options={[{ key: 'off', label: 'OFF' }, { key: 'thirds', label: '3×3' }, { key: 'golden', label: 'GOLDEN' }, { key: 'cross', label: 'CROSS' }, { key: 'diagonal', label: 'DIAG' }]} value={s.grid} onChange={(v) => set('grid', v)} fontSize={fs - 1} />
              </ScrollView>
            </Row>
            <Toggle label="Histogram" on={s.histogram} onChange={(v) => set('histogram', v)} hint="Live luminance with clipping warnings" />
            <Toggle label="Level / horizon" on={s.level} onChange={(v) => set('level', v)} />
            <Toggle label="Live ISO · shutter readout" on={s.meter} onChange={(v) => set('meter', v)} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { alignSelf: 'center', width: '100%', backgroundColor: 'rgba(14,15,18,0.9)', borderRadius: radius.lg, padding: 12, borderColor: colors.line, borderWidth: StyleSheet.hairlineWidth },
  tabsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reset: { paddingHorizontal: 8, paddingVertical: 6 },
  resetText: { color: colors.teal, fontWeight: '800', fontSize: 12, letterSpacing: 0.6 },
  row: { marginTop: 10 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rowLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  rowValue: { color: colors.amber, fontWeight: '800', fontVariant: ['tabular-nums'] },
  note: { color: colors.muted, fontSize: 12, marginTop: 8, lineHeight: 17 },
  hint: { color: colors.muted, fontSize: 11, marginTop: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.panel, borderColor: colors.line, borderWidth: StyleSheet.hairlineWidth },
  chipOn: { backgroundColor: colors.amber },
  chipText: { color: colors.text, fontWeight: '800', letterSpacing: 0.4 },
  toggle: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 2 },
  toggleLabel: { color: colors.text, fontWeight: '700', fontSize: 14 },
  sw: { width: 42, height: 24, borderRadius: 12, backgroundColor: '#3a3d44', padding: 3, justifyContent: 'center' },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.text, alignSelf: 'flex-start' },
});
