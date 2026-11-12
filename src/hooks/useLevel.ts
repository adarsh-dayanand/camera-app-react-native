import { useEffect, useState } from 'react';
import { Accelerometer } from 'expo-sensors';

/** Horizon tilt in degrees (0 = level). Sign: positive = device leaning right. */
export function useLevel(enabled: boolean, landscape: boolean): number {
  const [deg, setDeg] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    Accelerometer.setUpdateInterval(120);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const a = landscape ? Math.atan2(y, Math.hypot(x, z)) : Math.atan2(x, Math.hypot(y, z));
      setDeg((p) => p * 0.6 + ((a * 180) / Math.PI) * 0.4); // light smoothing
    });
    return () => sub.remove();
  }, [enabled, landscape]);
  return deg;
}
