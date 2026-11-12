# Lumen Cam

A free, no-paywall camera app built with React Native (Expo). Original design and name — it is
inspired by the *category* of pro-style camera apps, not a copy of any specific app's branding or assets.

## Features
**Exposure** — Auto, Manual (ISO + shutter), **ISO priority** (you fix ISO, shutter follows the light), **Shutter priority** (you fix shutter, ISO follows),
±EV compensation in auto and priority modes, AE/AF lock,
live "what the camera is actually using" ISO/shutter readout.
**Focus** — manual focus distance (near → ∞) or continuous AF; tap-to-focus.
**White balance** — presets (tungsten / fluorescent / daylight / cloudy) or free 2500–8000 K.
**Photo** — JPEG / HEIC / RAW·DNG, processing priority (speed / balanced / quality), HDR, shutter sound,
**geotagging** (GPS written into photo EXIF and video metadata; off by default, location only runs while enabled).
**Drive** — single, burst (3/5/10), exposure bracketing (3 frames, ±1 or ±2 EV; varies shutter when in manual), self-timer 3s/10s.
**Video** — 720p / 1080p / 4K, 24/30/60 fps, stabilization (off / auto / cinematic), H.264 / HEVC.
**Viewfinder aids** — live luminance histogram with highlight/shadow clipping warnings, level/horizon, composition grids
(3×3, golden ratio, cross, diagonal), aspect ratio (4:3 / 16:9 / full).
**Lenses** — ultra-wide / wide / telephoto selection (only the lenses your phone has are shown).
**Also** — flash (off/auto/on), torch, zoom, front/back camera, in-app gallery. A RESET button returns all manual controls to auto.
Everything is free — there is no payment code of any kind. Responsive for phones and tablets, portrait and landscape.

## Run
Manual controls use `react-native-vision-camera` (native code), so **Expo Go will not work** —
use a development build on a real device:
```bash
npm install
npx expo run:android      # needs Android SDK + a USB-connected phone
npx expo run:ios          # needs macOS + Xcode
```

## Notes / limitations
- Everything depends on the phone's hardware/OS. The app reads the camera's real limits at runtime and
  shows "Not supported" for anything missing; RAW/HEIC failures fall back to JPEG.
- ISO / shutter priority are emulated in software (the camera API only locks ISO and shutter together): the live
  histogram is metered and the free value is nudged toward mid-brightness (simulated to converge in ~4 steps
  without hunting). It is slower and less precise than a hardware AE, and warns when it hits a limit.
- Not implemented: aperture control (phone lenses have fixed apertures), focus peaking / zebras.
- The level indicator's tilt direction and the bracket/burst timing have not been tuned on hardware.
- This code type-checks and bundles, and the native project generates (`expo prebuild`), but it has
  **not been run on a physical device** from this environment — expect to tweak on first run.
