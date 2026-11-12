import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CameraScreen } from './src/screens/CameraScreen';
import { GalleryScreen } from './src/screens/GalleryScreen';

export default function App() {
  const [screen, setScreen] = useState<'camera' | 'gallery'>('camera');
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {screen === 'camera' ? (
        <CameraScreen onOpenGallery={() => setScreen('gallery')} />
      ) : (
        <GalleryScreen onClose={() => setScreen('camera')} />
      )}
    </SafeAreaProvider>
  );
}
