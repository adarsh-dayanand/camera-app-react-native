# Lumen Cam

A free, no-paywall camera app built with React Native (Expo). Original design and name — it is
inspired by the *category* of pro-style camera apps, not a copy of any specific app's branding or assets.

## Features
- Photo & video capture, front/back camera, saved to your photo library
- Zoom slider, flash (off/auto/on), torch, rule-of-thirds grid
- Self-timer (3s / 10s), aspect ratio (4:3 / 16:9 / full), haptic shutter
- In-app gallery of recent captures
- Responsive: phones and tablets, portrait and landscape (controls move to a side rail in landscape;
  larger touch targets and denser gallery grid on tablets)
- Everything is free — there is no payment code of any kind

## Run
```bash
npm install
npx expo start      # scan the QR with Expo Go, or press a / i for emulators
```
Camera needs a real device (or an emulator with a camera).

## Limitations
`expo-camera` does not expose manual ISO / shutter speed / white balance / RAW (DNG) capture.
Adding those requires a native camera module (e.g. `react-native-vision-camera` with a dev build, or
custom Camera2 / AVFoundation code) — this is the natural next step.
