import { useCallback, useRef, useState } from 'react';
import { CommonResolutions, useFrameOutput } from 'react-native-vision-camera';
import { scheduleOnRN } from 'react-native-worklets';

export const BINS = 48;
export type HistData = { bins: number[]; clipHi: number; clipLo: number; mean: number };

/**
 * Live luma histogram from a low-res YUV frame stream. The heavy loop runs on the camera
 * frame thread; only ~BINS numbers cross to JS (throttled to ~5/s).
 */
export function useHistogram() {
  const [data, setData] = useState<HistData | null>(null);
  const last = useRef(0);
  const publish = useCallback((d: HistData) => {
    const now = Date.now();
    if (now - last.current < 180) return; // throttle UI updates to ~5/s
    last.current = now;
    setData(d);
  }, []);

  const output = useFrameOutput({
    targetResolution: CommonResolutions.VGA_4_3,
    pixelFormat: 'yuv',
    dropFramesWhileBusy: true,
    onFrame(frame) {
      'worklet';
      try {
        const plane = frame.isPlanar ? frame.getPlanes()[0] : frame;
        const buf = new Uint8Array(plane.getPixelBuffer());
        const w = plane.width;
        const h = plane.height;
        const stride = plane.bytesPerRow;
        const bins = new Array<number>(BINS).fill(0);
        let n = 0;
        let sum = 0;
        let hi = 0;
        let lo = 0;
        for (let y = 0; y < h; y += 4) {
          const row = y * stride;
          for (let x = 0; x < w; x += 4) {
            const v = buf[row + x];
            bins[(v * BINS) >> 8]++;
            sum += v;
            n++;
            if (v >= 250) hi++;
            else if (v <= 5) lo++;
          }
        }
        if (n > 0) {
          scheduleOnRN(publish, { bins, clipHi: hi / n, clipLo: lo / n, mean: sum / n / 255 });
        }
      } finally {
        frame.dispose();
      }
    },
  });

  return { output, data };
}
