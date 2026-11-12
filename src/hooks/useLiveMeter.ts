import { useEffect, useState } from 'react';
import type { CameraController } from 'react-native-vision-camera';

export type Meter = { iso: number; shutter: number };

/** Polls what the camera is *actually* using right now (auto or manual). */
export function useLiveMeter(controller: CameraController | undefined, enabled: boolean): Meter | null {
  const [m, setM] = useState<Meter | null>(null);
  useEffect(() => {
    if (!controller || !enabled) return;
    const id = setInterval(() => {
      try {
        setM({ iso: Math.round(controller.iso), shutter: controller.exposureDuration });
      } catch {}
    }, 400);
    return () => clearInterval(id);
  }, [controller, enabled]);
  return m;
}
