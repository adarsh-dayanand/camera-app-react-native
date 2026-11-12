import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CameraController } from 'react-native-vision-camera';

/** auto = camera decides · manual = you set ISO+shutter · iso = you set ISO, shutter follows the light · shutter = you set shutter, ISO follows. */
export type ExposureKind = 'auto' | 'manual' | 'iso' | 'shutter';
export type Mode3A = 'auto' | 'manual';

export const WB_PRESETS = [
  { key: 'auto', label: 'AUTO', kelvin: 0 },
  { key: 'tungsten', label: 'TUNGSTEN', kelvin: 3000 },
  { key: 'fluor', label: 'FLUOR', kelvin: 4200 },
  { key: 'day', label: 'DAYLIGHT', kelvin: 5500 },
  { key: 'cloud', label: 'CLOUDY', kelvin: 6500 },
  { key: 'custom', label: 'KELVIN', kelvin: -1 },
] as const;
export type WbKey = (typeof WB_PRESETS)[number]['key'];

/** Map 0..1 -> [min,max] on a logarithmic scale (ISO and shutter feel natural this way). */
const logLerp = (t: number, min: number, max: number) => min * Math.pow(max / min, t);
const logT = (v: number, min: number, max: number) => Math.max(0, Math.min(1, Math.log(v / min) / Math.log(max / min)));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Priority-mode metering model
const TARGET_LUMA = 0.46; // mid-grey-ish target for the mean of the (gamma-encoded) luma
const GAMMA = 2.2; // converts a luma ratio into approximate stops of exposure
const DEADBAND = 0.15; // stops; ignore smaller errors so the image doesn't "hunt"

export function formatShutter(seconds: number): string {
  if (seconds >= 0.5) return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`;
  return `1/${Math.round(1 / seconds)}`;
}

/**
 * Drives manual ISO / shutter / focus / white balance on a VisionCamera CameraController.
 * `controller.resetFocus()` returns *all* 3A (AE/AF/AWB) to continuous-auto, so whenever one
 * channel goes back to auto we reset and then re-apply the channels that are still manual.
 *
 * ISO-priority and shutter-priority are not native camera features (the API can only lock ISO
 * and shutter *together*), so they are emulated with a software auto-exposure loop: the live
 * luma histogram is metered and the free parameter is nudged toward a target brightness.
 */
export function useManualControls(
  controller: CameraController | undefined,
  onError: (m: string) => void,
  /** latest metered mean luma (0..1), a new object per measurement — needed for the priority modes */
  luma: { mean: number } | null,
) {
  const [exposure, setExposure] = useState<ExposureKind>('auto');
  const [focus, setFocus] = useState<Mode3A>('auto');
  const [wb, setWb] = useState<WbKey>('auto');
  const [isoT, setIsoT] = useState(0.3); // 0..1 slider positions
  const [shutterT, setShutterT] = useState(0.5);
  const [lens, setLens] = useState(0.5);
  const [kelvin, setKelvin] = useState(5500);
  const [ev, setEv] = useState(0);
  const [aeafLock, setAeafLock] = useState(false);
  const [hold, setHold] = useState(false); // pause the priority loop (e.g. during bracketing)
  const [limitHit, setLimitHit] = useState<null | 'dark' | 'bright'>(null);

  // Serialise native calls so rapid slider drags can't interleave with a reset.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const run = useCallback(
    (fn: () => Promise<void>) => {
      queue.current = queue.current.then(fn).catch((e) => onError(String(e?.message ?? e)));
    },
    [onError],
  );

  const limits = useMemo(() => {
    if (!controller) return null;
    try {
      const d = controller.device;
      return {
        minISO: controller.minISO,
        maxISO: controller.maxISO,
        minDur: controller.minExposureDuration,
        maxDur: Math.min(controller.maxExposureDuration, 1), // keep the UI usable: cap at 1s
        canExposure: d.supportsExposureLocking,
        canFocus: d.supportsFocusLocking,
        canWb: d.supportsWhiteBalanceLocking,
        canEv: d.supportsExposureBias,
        minEv: d.minExposureBias,
        maxEv: d.maxExposureBias,
      };
    } catch {
      return null;
    }
  }, [controller]);

  const iso = limits ? Math.round(logLerp(isoT, limits.minISO, limits.maxISO)) : 0;
  const shutter = limits ? logLerp(shutterT, limits.minDur, limits.maxDur) : 0;
  const wbKelvin = (() => {
    const p = WB_PRESETS.find((x) => x.key === wb)!;
    return p.kelvin > 0 ? p.kelvin : kelvin;
  })();
  const priority = exposure === 'iso' || exposure === 'shutter';
  const locked = exposure !== 'auto'; // exposure is being driven through setExposureLocked

  const applyWb = useCallback(async (c: CameraController, k: number) => {
    const gains = c.convertWhiteBalanceTemperatureAndTintValues({ temperature: k, tint: 0 });
    await c.setWhiteBalanceLocked(gains);
  }, []);

  // Channel switched -> reset to auto, then re-lock whatever is still manual.
  useEffect(() => {
    if (!controller || !limits) return;
    run(async () => {
      await controller.resetFocus();
      if (locked && limits.canExposure) {
        let d = shutter;
        let i = iso;
        if (priority) {
          // Start from the exposure the camera itself would have chosen, so there is no brightness jump.
          await sleep(350);
          const curDur = controller.exposureDuration;
          const curIso = controller.iso;
          const light = curDur * curIso; // duration × ISO is (roughly) constant for a given scene brightness
          if (exposure === 'iso') {
            d = Math.max(limits.minDur, Math.min(limits.maxDur, light / i));
            setShutterT(logT(d, limits.minDur, limits.maxDur));
          } else {
            i = Math.max(limits.minISO, Math.min(limits.maxISO, light / d));
            setIsoT(logT(i, limits.minISO, limits.maxISO));
          }
        }
        await controller.setExposureLocked(d, i);
      }
      if (focus === 'manual' && limits.canFocus) await controller.setFocusLocked(lens);
      if (wb !== 'auto' && limits.canWb) await applyWb(controller, wbKelvin);
      // AE/AF lock: freeze whatever is still automatic at its current value
      if (aeafLock) {
        if (exposure === 'auto' && limits.canExposure) await controller.lockCurrentExposure();
        if (focus === 'auto' && limits.canFocus) await controller.lockCurrentFocus();
      }
    });
    setLimitHit(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, exposure, focus, wb === 'auto', aeafLock]);

  // Slider (or priority loop) changed a locked-exposure value.
  useEffect(() => {
    if (controller && limits && locked && limits.canExposure && !hold) {
      run(() => controller.setExposureLocked(shutter, iso));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isoT, shutterT]);

  // ---- Priority loop: nudge the free parameter toward the target brightness ----
  useEffect(() => {
    if (!limits || !priority || hold || !luma || !limits.canExposure) return;
    const mean = Math.max(0.01, Math.min(0.99, luma.mean));
    const target = TARGET_LUMA * Math.pow(2, ev / GAMMA); // exposure compensation shifts the target
    const stops = GAMMA * Math.log2(target / mean); // + = need more light
    if (Math.abs(stops) < DEADBAND) {
      setLimitHit(null);
      return;
    }
    const step = Math.max(-1, Math.min(1, stops * 0.6)); // damped, max 1 stop per measurement
    if (exposure === 'iso') {
      const next = shutter * Math.pow(2, step);
      const clamped = Math.max(limits.minDur, Math.min(limits.maxDur, next));
      setLimitHit(clamped !== next ? (step > 0 ? 'dark' : 'bright') : null);
      if (clamped !== shutter) setShutterT(logT(clamped, limits.minDur, limits.maxDur));
    } else {
      const next = iso * Math.pow(2, step);
      const clamped = Math.max(limits.minISO, Math.min(limits.maxISO, next));
      setLimitHit(clamped !== next ? (step > 0 ? 'dark' : 'bright') : null);
      if (Math.round(clamped) !== iso) setIsoT(logT(clamped, limits.minISO, limits.maxISO));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [luma]);

  useEffect(() => {
    if (controller && limits && focus === 'manual' && limits.canFocus) run(() => controller.setFocusLocked(lens));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lens]);

  useEffect(() => {
    if (controller && limits && wb !== 'auto' && limits.canWb) run(() => applyWb(controller, wbKelvin));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wb, kelvin]);

  const anyManual = locked || focus === 'manual' || wb !== 'auto' || aeafLock;
  const resetAll = useCallback(() => {
    setExposure('auto');
    setFocus('auto');
    setWb('auto');
    setEv(0);
    setAeafLock(false);
  }, []);

  return {
    limits, exposure, setExposure, priority, locked, limitHit, hold, setHold,
    focus, setFocus, wb, setWb,
    aeafLock, setAeafLock, isoT, setIsoT, shutterT, setShutterT, lens, setLens, kelvin, setKelvin, ev, setEv,
    iso, shutter, wbKelvin, anyManual, resetAll,
  };
}
