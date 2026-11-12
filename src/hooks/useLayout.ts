import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type LayoutInfo = {
  width: number;
  height: number;
  isLandscape: boolean;
  isTablet: boolean;
  /** Controls live in a vertical rail on the right (landscape) or a bottom bar (portrait). */
  railSide: boolean;
  /** Scale factor for touch targets: 1 on phones, up to 1.35 on tablets. */
  scale: number;
  insets: { top: number; bottom: number; left: number; right: number };
};

export function useLayout(): LayoutInfo {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;
  const shortest = Math.min(width, height);
  const isTablet = shortest >= 600;
  const scale = isTablet ? Math.min(1.35, shortest / 600) : Math.max(0.9, Math.min(1, shortest / 390));
  return { width, height, isLandscape, isTablet, railSide: isLandscape, scale, insets };
}
