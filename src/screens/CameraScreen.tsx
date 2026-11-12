import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  CommonResolutions,
  useCameraDevice,
  useCameraDevices,
  useCameraPermission,
  useMicrophonePermission,
  usePhotoOutput,
  useVideoOutput,
} from 'react-native-vision-camera';
import type { CameraController, CameraRef, Recorder } from 'react-native-vision-camera';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Haptics from 'expo-haptics';
import { colors, radius } from '../theme';
import { useLayout } from '../hooks/useLayout';
import { IconButton } from '../components/IconButton';
import { ShutterButton } from '../components/ShutterButton';
import { Segmented } from '../components/Segmented';
import { ZoomSlider } from '../components/ZoomSlider';
import { Grid } from '../components/Grid';
import { ProPanel } from '../components/ProPanel';
import type { Caps } from '../components/ProPanel';
import { Histogram } from '../components/Histogram';
import { LevelIndicator } from '../components/LevelIndicator';
import { formatShutter, useManualControls } from '../hooks/useManualControls';
import { useShootingSettings } from '../hooks/useShootingSettings';
import type { Lens } from '../hooks/useShootingSettings';
import { useHistogram } from '../hooks/useHistogram';
import { useLevel } from '../hooks/useLevel';
import { useLiveMeter } from '../hooks/useLiveMeter';

const VIDEO_RES = {
  '720': CommonResolutions.HD_16_9,
  '1080': CommonResolutions.FHD_16_9,
  '2160': CommonResolutions.UHD_16_9,
} as const;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Mode = 'photo' | 'video';
type Ratio = '4:3' | '16:9' | 'full';
const TIMERS = [0, 3, 10] as const;
type FlashMode = 'off' | 'auto' | 'on';
type CameraType = 'back' | 'front';
const FLASH_CYCLE: FlashMode[] = ['off', 'auto', 'on'];
const FLASH_GLYPH: Record<FlashMode, string> = { off: '⚡̸', auto: '⚡A', on: '⚡' };

export function CameraScreen({ onOpenGallery }: { onOpenGallery: () => void }) {
  const L = useLayout();
  const cam = useRef<CameraRef>(null);
  const recorder = useRef<Recorder | null>(null);
  const camPerm = useCameraPermission();
  const micPerm = useMicrophonePermission();
  const [libPerm, requestLib] = MediaLibrary.usePermissions({ writeOnly: true });

  const [mode, setMode] = useState<Mode>('photo');
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [torch, setTorch] = useState(false);
  const [ratio, setRatio] = useState<Ratio>('4:3');
  const [timer, setTimer] = useState<(typeof TIMERS)[number]>(0);
  const [zoom, setZoom] = useState(0); // 0..1 slider position
  const [ready, setReady] = useState(false);
  const [controller, setController] = useState<CameraController | undefined>();
  const { s, set } = useShootingSettings();
  const [proOpen, setProOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [lastUri, setLastUri] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Recording clock
  useEffect(() => {
    if (!recording) return;
    setSeconds(0);
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const devices = useCameraDevices();
  const lensFilter = facing === 'back' && s.lens !== 'auto' ? { physicalDevices: [s.lens] } : undefined;
  const device = useCameraDevice(facing, lensFilter);
  const wide = ratio === '16:9';

  // What this phone can actually do (drives which options the panel offers)
  const caps: Caps = React.useMemo(() => {
    const found = new Set<string>();
    for (const d of devices) {
      if (d.position !== 'back') continue;
      found.add(d.type);
      d.physicalDevices.forEach((p) => found.add(p.type));
    }
    const lenses: Lens[] = ['auto'];
    (['ultra-wide-angle', 'wide-angle', 'telephoto'] as const).forEach((l) => found.has(l) && lenses.push(l));
    return { lenses, hdr: !!device?.supportsPhotoHDR, codecs: ['h264', 'h265'] };
  }, [devices, device]);

  const photoOutput = usePhotoOutput({
    containerFormat: s.format,
    targetResolution: wide ? CommonResolutions.UHD_16_9 : CommonResolutions.UHD_4_3,
    quality: 1,
    qualityPrioritization: s.priority,
  });
  const videoOutput = useVideoOutput({ enableAudio: micPerm.hasPermission, targetResolution: VIDEO_RES[s.videoRes] });
  const hist = useHistogram();
  const manual = useManualControls(controller, setToast);
  const tilt = useLevel(s.level, L.isLandscape);
  const meter = useLiveMeter(controller, s.meter || proOpen);

  const constraints = React.useMemo(
    () => [
      ...(s.hdr && caps.hdr ? [{ photoHDR: true }] : []),
      { fps: s.fps },
      { videoStabilizationMode: s.stab },
    ],
    [s.hdr, caps.hdr, s.fps, s.stab],
  );

  // Preferred video codec (only when the device reports support)
  useEffect(() => {
    try {
      if (videoOutput.getSupportedVideoCodecs().includes(s.codec)) videoOutput.setOutputSettings({ codec: s.codec }).catch(() => {});
    } catch {}
  }, [videoOutput, s.codec]);

  // 0..1 slider -> real zoom factor (cap at 8x so the slider stays useful on 100x devices)
  const minZ = device?.minZoom ?? 1;
  const maxZ = Math.min(device?.maxZoom ?? 1, 8);
  const zoomFactor = minZ + zoom * Math.max(0, maxZ - minZ);

  const save = useCallback(
    async (uri: string) => {
      try {
        if (!libPerm?.granted) {
          const r = await requestLib();
          if (!r.granted) {
            setToast('Saved in app cache only (no library permission)');
            setLastUri(uri);
            return;
          }
        }
        await MediaLibrary.saveToLibraryAsync(uri);
        setToast('Saved to library');
      } catch {
        setToast('Could not save to library');
      }
      setLastUri(uri);
    },
    [libPerm?.granted, requestLib],
  );

  const shootOne = useCallback(
    async (flashMode: FlashMode) => {
      const file = await photoOutput.capturePhotoToFile({ flashMode, enableShutterSound: s.shutterSound }, {});
      await save(file.filePath.startsWith('file://') ? file.filePath : `file://${file.filePath}`);
    },
    [photoOutput, s.shutterSound, save],
  );

  const capture = useCallback(async () => {
    if (!ready) return;
    setBusy(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      if (s.drive === 'single') {
        await shootOne(flash);
      } else if (s.drive === 'burst') {
        for (let i = 0; i < s.burstCount; i++) {
          setToast(`Burst ${i + 1}/${s.burstCount}`);
          await shootOne('off');
        }
      } else if (controller) {
        // Auto-exposure bracketing: -step, 0, +step
        const steps = [-s.bracketStep, 0, s.bracketStep];
        const limits = manual.limits;
        try {
          for (const st of steps) {
            if (manual.exposure === 'auto') {
              const lo = limits?.minEv ?? -2;
              const hi = limits?.maxEv ?? 2;
              await controller.setExposureBias(Math.max(lo, Math.min(hi, manual.ev + st)));
            } else if (limits) {
              const d = Math.max(limits.minDur, Math.min(limits.maxDur, manual.shutter * Math.pow(2, st)));
              await controller.setExposureLocked(d, manual.iso);
            }
            await sleep(350); // let the sensor settle
            await shootOne('off');
          }
        } finally {
          if (manual.exposure === 'auto') await controller.setExposureBias(manual.ev).catch(() => {});
          else await controller.setExposureLocked(manual.shutter, manual.iso).catch(() => {});
        }
      }
    } catch {
      if (s.format !== 'jpeg') {
        set('format', 'jpeg');
        setToast(`${s.format === 'dng' ? 'RAW' : 'HEIC'} not available here — switched to JPEG`);
      } else {
        setToast('Capture failed');
      }
    } finally {
      setBusy(false);
    }
  }, [ready, s.drive, s.burstCount, s.bracketStep, s.format, flash, shootOne, controller, manual, set]);

  const runTimer = useCallback(
    async (then: () => void) => {
      if (timer === 0) return then();
      for (let n = timer; n > 0; n--) {
        setCountdown(n);
        await new Promise((r) => setTimeout(r, 1000));
      }
      setCountdown(null);
      then();
    },
    [timer],
  );

  const onShutter = useCallback(async () => {
    if (mode === 'photo') return runTimer(capture);
    if (!ready) return;
    if (recording) {
      await recorder.current?.stopRecording();
      return;
    }
    if (!micPerm.hasPermission) await micPerm.requestPermission();
    try {
      const rec = await videoOutput.createRecorder({});
      recorder.current = rec;
      await rec.startRecording(
        (filePath) => {
          setRecording(false);
          recorder.current = null;
          save(filePath.startsWith('file://') ? filePath : `file://${filePath}`);
        },
        () => {
          setRecording(false);
          setToast('Recording failed');
        },
      );
      setRecording(true);
    } catch {
      setToast('Recording failed');
    }
  }, [mode, runTimer, capture, ready, recording, micPerm, videoOutput, save]);

  if (!camPerm.hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permBody}>Lumen Cam needs the camera to show a live preview and take shots.</Text>
        <Pressable style={styles.permBtn} onPress={camPerm.requestPermission} accessibilityRole="button">
          <Text style={styles.permBtnText}>Allow camera</Text>
        </Pressable>
      </View>
    );
  }

  const rail = L.railSide;
  const sc = L.scale;
  const shutterSize = Math.round(76 * sc);
  const btn = Math.round(44 * sc);
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Preview box: keeps chosen aspect ratio, centred in the space left by the control area.
  const ar = ratio === '4:3' ? 3 / 4 : ratio === '16:9' ? 9 / 16 : undefined;
  const previewStyle = ar
    ? { aspectRatio: rail ? 1 / ar : ar, [rail ? 'height' : 'width']: '100%' as const, maxWidth: '100%' as const, maxHeight: '100%' as const }
    : { flex: 1, alignSelf: 'stretch' as const };

  const zoomLabel = `${zoomFactor.toFixed(1)}×`;

  return (
    <View style={[styles.root, { flexDirection: rail ? 'row' : 'column' }]}>
      {/* ---- Preview area ---- */}
      <View style={[styles.stage, { paddingTop: rail ? 0 : L.insets.top, paddingLeft: L.insets.left }]}>
        <View style={[styles.previewBox, previewStyle]}>
          {device ? (
            <Camera
              ref={cam}
              style={StyleSheet.absoluteFill}
              isActive
              device={device}
              outputs={s.histogram ? [photoOutput, videoOutput, hist.output] : [photoOutput, videoOutput]}
              constraints={constraints}
              zoom={zoomFactor}
              exposure={manual.exposure === 'auto' ? manual.ev : 0}
              torchMode={torch ? 'on' : 'off'}
              resizeMode="cover"
              enableNativeTapToFocusGesture
              mirrorMode={facing === 'front' ? 'on' : 'off'}
              onConfigured={() => {
                setController(cam.current?.controller);
                setReady(true);
              }}
              onError={(e) => setToast(e.message)}
            />
          ) : null}
          <Grid type={s.grid} />
          {s.level ? <LevelIndicator degrees={tilt} /> : null}

          {/* Top tool strip */}
          <View style={[styles.topStrip, { top: rail ? L.insets.top + 8 : 10 }]}>
            <IconButton label={`Flash ${flash}`} glyph={FLASH_GLYPH[flash]} size={btn}
              active={flash !== 'off'}
              onPress={() => setFlash(FLASH_CYCLE[(FLASH_CYCLE.indexOf(flash) + 1) % FLASH_CYCLE.length])} />
            <IconButton label="Torch" glyph="☀" size={btn} active={torch} onPress={() => setTorch((t) => !t)} />
            <IconButton label="Timer" glyph="⏱" size={btn} active={timer > 0} badge={timer ? `${timer}s` : undefined}
              onPress={() => setTimer(TIMERS[(TIMERS.indexOf(timer) + 1) % TIMERS.length])} />
            <IconButton label="Grid" glyph="▦" size={btn} active={s.grid !== 'off'} onPress={() => set('grid', s.grid === 'off' ? 'thirds' : 'off')} />
            <Pressable
              onPress={() => setProOpen((o) => !o)}
              accessibilityRole="button" accessibilityLabel="Pro controls"
              style={[styles.ratio, { height: btn }, (proOpen || manual.anyManual) && { backgroundColor: colors.amber }]}>
              <Text style={[styles.ratioText, (proOpen || manual.anyManual) && { color: colors.ink }]}>PRO</Text>
            </Pressable>
            <Pressable
              onPress={() => setRatio((r) => (r === '4:3' ? '16:9' : r === '16:9' ? 'full' : '4:3'))}
              accessibilityRole="button" accessibilityLabel="Aspect ratio"
              style={[styles.ratio, { height: btn }]}>
              <Text style={styles.ratioText}>{ratio === 'full' ? 'FULL' : ratio}</Text>
            </Pressable>
          </View>

          {s.histogram && !proOpen ? (
            <View style={[styles.histWrap, { top: (rail ? L.insets.top : 0) + 10 + btn + 12 }]} pointerEvents="none">
              <Histogram data={hist.data} width={Math.round(110 * Math.max(1, sc))} />
            </View>
          ) : null}

          {s.meter && meter && !proOpen ? (
            <View style={styles.readout} pointerEvents="none">
              <Text style={styles.readoutText}>
                {manual.anyManual ? 'M ' : 'A '}ISO {meter.iso}  ·  {formatShutter(meter.shutter)}
                {s.drive !== 'single' ? `  ·  ${s.drive === 'burst' ? 'BURST' : 'AEB'}` : ''}
              </Text>
            </View>
          ) : null}

          {proOpen ? (
            <View style={styles.proWrap}>
              <ProPanel m={manual} s={s} set={set} caps={caps} scale={sc} maxWidth={Math.min(L.width, 520)} />
            </View>
          ) : null}

          {recording ? (
            <View style={[styles.recPill, { top: (rail ? L.insets.top : 0) + 10 + btn + 12 }]}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>{fmt(seconds)}</Text>
            </View>
          ) : null}

          {countdown !== null ? (
            <View style={styles.countdown} pointerEvents="none">
              <Text style={[styles.countText, { fontSize: 120 * sc }]}>{countdown}</Text>
            </View>
          ) : null}

          {toast ? (
            <View style={styles.toast} pointerEvents="none">
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          ) : null}

          {!ready ? <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.amber} /> : null}
        </View>
      </View>

      {/* ---- Control deck ---- */}
      <View
        style={[
          styles.deck,
          rail
            ? { width: Math.round(150 * sc) + L.insets.right, paddingRight: L.insets.right, paddingVertical: Math.max(L.insets.top, 12), flexDirection: 'column' }
            : { paddingBottom: Math.max(L.insets.bottom, 12), paddingTop: 10, flexDirection: 'column' },
        ]}
      >
        {/* Zoom */}
        <View style={[styles.zoomRow, rail && { flexDirection: 'column', flex: 1 }]}>
          <Text style={styles.zoomLabel}>{zoomLabel}</Text>
          <ZoomSlider value={zoom} onChange={setZoom} vertical={rail}
            length={rail ? Math.max(140, L.height - 330 * sc) : Math.min(L.width - 140, 420)} />
        </View>

        {/* Mode */}
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <Segmented<Mode>
            options={[{ key: 'photo', label: 'PHOTO' }, { key: 'video', label: 'VIDEO' }]}
            value={mode}
            onChange={(m) => !recording && setMode(m)}
            fontSize={12 * Math.max(1, sc)}
          />
        </View>

        {/* Shutter row */}
        <View style={[styles.shutterRow, rail && { flexDirection: 'column-reverse', gap: 18 }]}>
          <Pressable onPress={onOpenGallery} accessibilityRole="button" accessibilityLabel="Open gallery"
            style={[styles.thumb, { width: btn + 6, height: btn + 6 }]}>
            {lastUri ? <Image source={{ uri: lastUri }} style={styles.thumbImg} /> : <Text style={styles.thumbEmpty}>▣</Text>}
          </Pressable>
          <ShutterButton size={shutterSize} video={mode === 'video'} recording={recording} busy={busy || countdown !== null} onPress={onShutter} />
          <IconButton label="Flip camera" glyph="⟲" size={btn + 6} onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  center: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', padding: 32 },
  permTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 8 },
  permBody: { color: colors.muted, textAlign: 'center', marginBottom: 20, maxWidth: 380 },
  permBtn: { backgroundColor: colors.amber, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.pill },
  permBtnText: { color: colors.ink, fontWeight: '800' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewBox: { overflow: 'hidden', borderRadius: radius.md, backgroundColor: '#000' },
  topStrip: { position: 'absolute', left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratio: { paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.panel, justifyContent: 'center', borderColor: colors.line, borderWidth: StyleSheet.hairlineWidth },
  ratioText: { color: colors.text, fontWeight: '800', fontSize: 12 },
  recPill: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: colors.panel, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger, marginRight: 8 },
  recText: { color: colors.text, fontWeight: '800', fontVariant: ['tabular-nums'] },
  countdown: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  countText: { color: colors.amber, fontWeight: '900' },
  proWrap: { position: 'absolute', left: 8, right: 8, bottom: 8 },
  readout: { position: 'absolute', left: 12, bottom: 12, backgroundColor: colors.panel, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  readoutText: { color: colors.amber, fontWeight: '800', fontSize: 12, fontVariant: ['tabular-nums'] },
  histWrap: { position: 'absolute', left: 10 },
  toast: { position: 'absolute', bottom: 16, alignSelf: 'center', backgroundColor: colors.panelSolid, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  toastText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  deck: { backgroundColor: colors.ink, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'space-between' },
  zoomRow: { alignItems: 'center', gap: 6 },
  zoomLabel: { color: colors.amber, fontWeight: '800', fontSize: 14, fontVariant: ['tabular-nums'] },
  shutterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', alignSelf: 'stretch', paddingTop: 6 },
  thumb: { borderRadius: radius.sm, backgroundColor: colors.panelSolid, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderColor: colors.line, borderWidth: 1 },
  thumbImg: { width: '100%', height: '100%' },
  thumbEmpty: { color: colors.muted, fontSize: 20 },
});
