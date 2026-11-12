# Lumen Cam

A free, no-paywall camera app built with React Native (Expo). Original design and name — it is
inspired by the *category* of pro-style camera apps, not a copy of any specific app's branding or assets.

## Features
- **Manual controls (PRO panel):**
  - **Exposure:** manual ISO and shutter speed (logarithmic sliders), or auto with ±EV compensation
  - **Focus:** manual focus distance (near → ∞), or continuous autofocus; tap the preview to focus
  - **White balance:** presets (tungsten, fluorescent, daylight, cloudy) or a free 2500–8000 K slider
  - **RAW:** capture unprocessed DNG, or JPEG
  - A RESET button returns everything to auto. Controls the device doesn't support show "Not supported".
- Photo & video capture, front/back camera, saved to your photo library
- Zoom slider, flash (off/auto/on), torch, rule-of-thirds grid
- Self-timer (3s / 10s), aspect ratio (4:3 / 16:9 / full), haptic shutter
- In-app gallery of recent captures
- Responsive: phones and tablets, portrait and landscape (controls move to a side rail in landscape;
  larger touch targets and denser gallery grid on tablets)
- Everything is free — there is no payment code of any kind

## Run
Manual controls use `react-native-vision-camera` (native code), so **Expo Go will not work** —
use a development build on a real device:
```bash
npm install
npx expo run:android      # needs Android SDK + a USB-connected phone
npx expo run:ios          # needs macOS + Xcode
```

## Notes / limitations
- Manual ISO/shutter/focus/WB and RAW depend on the phone's hardware and OS support. The app reads
  the device's real limits at runtime and disables what isn't available. If RAW capture fails it falls
  back to JPEG automatically.
- Shutter is capped at 1 s in the UI. There is no histogram or focus peaking yet.
- This code type-checks and bundles, and the native project generates (`expo prebuild`), but it has
  **not been run on a physical device** from this environment — expect to tweak on first run.
