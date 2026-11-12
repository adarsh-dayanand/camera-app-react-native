import { useCallback, useState } from 'react';

export type PhotoFormat = 'jpeg' | 'heic' | 'dng';
export type Drive = 'single' | 'burst' | 'bracket';
export type GridType = 'off' | 'thirds' | 'golden' | 'cross' | 'diagonal';
export type Priority = 'speed' | 'balanced' | 'quality';
export type VideoRes = '720' | '1080' | '2160';
export type Stab = 'off' | 'auto' | 'cinematic';
export type Codec = 'h264' | 'h265';
export type Lens = 'auto' | 'ultra-wide-angle' | 'wide-angle' | 'telephoto';

export type Settings = {
  // photo
  format: PhotoFormat;
  hdr: boolean;
  priority: Priority;
  shutterSound: boolean;
  drive: Drive;
  burstCount: 3 | 5 | 10;
  bracketStep: 1 | 2; // EV between frames
  // video
  videoRes: VideoRes;
  fps: 24 | 30 | 60;
  stab: Stab;
  codec: Codec;
  // viewfinder aids
  grid: GridType;
  histogram: boolean;
  level: boolean;
  meter: boolean;
  lens: Lens;
};

export const DEFAULT_SETTINGS: Settings = {
  format: 'jpeg',
  hdr: false,
  priority: 'balanced',
  shutterSound: true,
  drive: 'single',
  burstCount: 5,
  bracketStep: 1,
  videoRes: '1080',
  fps: 30,
  stab: 'auto',
  codec: 'h264',
  grid: 'thirds',
  histogram: true,
  level: true,
  meter: true,
  lens: 'auto',
};

export function useShootingSettings() {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  const set = useCallback(<K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v })), []);
  return { s, set };
}
