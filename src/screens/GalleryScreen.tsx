import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as MediaLibrary from 'expo-media-library/legacy';
import { colors } from '../theme';
import { useLayout } from '../hooks/useLayout';

export function GalleryScreen({ onClose }: { onClose: () => void }) {
  const { width, isTablet, insets } = useLayout();
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        setError('Photo library access is needed to show your captures.');
        return;
      }
      const page = await MediaLibrary.getAssetsAsync({
        first: 120,
        mediaType: ['photo', 'video'],
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });
      setAssets(page.assets);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Responsive grid: 3 columns on small phones, scaling up to 6+ on tablets.
  const gap = 4;
  const target = isTablet ? 170 : 120;
  const cols = Math.max(3, Math.floor(width / target));
  const size = (width - gap * (cols + 1)) / cols;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Back to camera" hitSlop={10}>
          <Text style={styles.back}>‹ Camera</Text>
        </Pressable>
        <Text style={styles.title}>Captures</Text>
        <View style={{ width: 70 }} />
      </View>
      {error ? <Text style={styles.msg}>{error}</Text> : null}
      <FlatList
        key={cols}
        data={assets}
        numColumns={cols}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: gap, paddingBottom: insets.bottom + gap }}
        ListEmptyComponent={<Text style={styles.msg}>{error ? '' : 'Nothing here yet — take your first shot.'}</Text>}
        renderItem={({ item }) => (
          <View style={{ margin: gap / 2 }}>
            <Image source={{ uri: item.uri }} style={{ width: size, height: size, borderRadius: 6 }} />
            {item.mediaType === 'video' ? <Text style={styles.vid}>▶</Text> : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  back: { color: colors.amber, fontSize: 17, fontWeight: '700', width: 70 },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  msg: { color: colors.muted, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
  vid: { position: 'absolute', right: 6, bottom: 4, color: colors.text, fontSize: 14 },
});
