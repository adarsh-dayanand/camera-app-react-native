import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CameraController } from 'react-native-vision-camera';

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

export function formatShutter(seconds: number): string {
  if (seconds >= 0.5) return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`;
  return `1/${Math.round(1 / seconds)}`;
}

/**
 * Drives manual ISO / shutter / focus / white balance on a VisionCamera CameraController.
 * `controller.resetFocus()` returns *all* 3A (AE/AF/AWB) to continuous-auto, so whenever one
 * channel goes back to auto we reset and then re-apply the channels that are still manual.
 */
export function useManualControls(controller: CameraController | undefined, onError: (m: string) => void) {
  const [exposure, setExposure] = useState<Mode3A>('auto');
  const [focus, setFocus] = useState<Mode3A>('auto');
  const [wb, setWb] = useState<WbKey>('auto');
  const [isoT, setIsoT] = useState(0.3); // 0..1 slider positions
  const [shutterT, setShutterT] = useState(0.5);
  const [lens, setLens] = useState(0.5);
  const [kelvin, setKelvin] = useState(5500);
  const [ev, setEv] = useState(0);

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

  const applyWb = useCallback(
    async (c: CameraController, k: number) => {
      const gains = c.convertWhiteBalanceTemperatureAndTintValues({ temperature: k, tint: 0 });
      await c.setWhiteBalanceLocked(gains);
    },
    [],
  );

  // Channel switched -> reset to auto, then re-lock whatever is still manual.
  useEffect(() => {
    if (!controller || !limits) return;
    run(async () => {
      await controller.resetFocus();
      if (exposure === 'manual' && limits.canExposure) await controller.setExposureLocked(shutter, iso);
      if (focus === 'manual' && limits.canFocus) await controller.setFocusLocked(lens);
      if (wb !== 'auto' && limits.canWb) await applyWb(controller, wbKelvin);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, exposure, focus, wb === 'auto']);

  useEffect(() => {
    if (controller && limits && exposure === 'manual' && limits.canExposure) {
      run(() => controller.setExposureLocked(shutter, iso));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isoT, shutterT]);

  useEffect(() => {
    if (controller && limits && focus === 'manual' && limits.canFocus) run(() => controller.setFocusLocked(lens));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lens]);

  useEffect(() => {
    if (controller && limits && wb !== 'auto' && limits.canWb) run(() => applyWb(controller, wbKelvin));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wb, kelvin]);

  const anyManual = exposure === 'manual' || focus === 'manual' || wb !== 'auto';
  const resetAll = useCallback(() => {
    setExposure('auto');
    setFocus('auto');
    setWb('auto');
    setEv(0);
  }, []);

  return {
    limits, exposure, setExposure, focus, setFocus, wb, setWb,
    isoT, setIsoT, shutterT, setShutterT, lens, setLens, kelvin, setKelvin, ev, setEv,
    iso, shutter, wbKelvin, anyManual, resetAll,
  };
}
