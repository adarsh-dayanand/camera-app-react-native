import { useEffect, useState } from 'react';
import type { Location } from 'react-native-vision-camera';
import { useLocationManager } from 'react-native-vision-camera-location';

export type GeoState = 'off' | 'asking' | 'searching' | 'fixed' | 'denied';

/**
 * GPS for EXIF/video tags. Location services only run while the setting is on.
 * `onDenied` is called when the user refuses permission so the caller can switch the setting back off.
 */
export function useGeotag(enabled: boolean, onDenied: () => void) {
  const manager = useLocationManager({ accuracy: 'high', distanceFilter: 5, updateInterval: 5000 });
  const [location, setLocation] = useState<Location | undefined>();
  const [state, setState] = useState<GeoState>('off');

  useEffect(() => {
    if (!enabled) {
      setState('off');
      setLocation(undefined);
      return;
    }
    let cancelled = false;
    let sub: { remove: () => void } | undefined;
    (async () => {
      try {
        if (manager.locationPermissionStatus !== 'authorized') {
          setState('asking');
          const ok = await manager.requestLocationPermission();
          if (!ok) {
            if (!cancelled) {
              setState('denied');
              onDenied();
            }
            return;
          }
        }
        if (cancelled) return;
        const last = manager.lastKnownLocation;
        setLocation(last);
        setState(last ? 'fixed' : 'searching');
        sub = manager.addOnLocationChangedListener((l) => {
          setLocation(l);
          setState('fixed');
        });
        await manager.startUpdating();
      } catch {
        if (!cancelled) setState('denied');
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
      manager.stopUpdating().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, manager]);

  return { location, state };
}
