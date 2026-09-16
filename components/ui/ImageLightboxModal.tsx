import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

export interface ImageLightboxModalProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  canAddPhoto?: boolean;
  onAddPhoto?: () => void;
  uploadingPhoto?: boolean;
}

export function ImageLightboxModal({
  visible,
  images,
  initialIndex = 0,
  onClose,
  canAddPhoto = false,
  onAddPhoto,
  uploadingPhoto = false,
}: ImageLightboxModalProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const flatListRef = useRef<FlatList<string>>(null);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Sync index on open
  useEffect(() => {
    if (visible) {
      const safeIndex = Math.max(0, Math.min(initialIndex, images.length - 1));
      setCurrentIndex(safeIndex);
      // Small timeout to allow FlatList layout to settle
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: safeIndex, animated: false });
      }, 50);
    }
  }, [visible, initialIndex, images.length]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / screenWidth);
      if (index >= 0 && index < images.length && index !== currentIndex) {
        setCurrentIndex(index);
        Haptics.selectionAsync().catch(() => {});
      }
    },
    [screenWidth, images.length, currentIndex],
  );

  const goToPrev = () => {
    if (currentIndex > 0) {
      const nextIdx = currentIndex - 1;
      setCurrentIndex(nextIdx);
      flatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      flatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  if (!visible || images.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {/* Swipeable image carousel */}
        <FlatList
          ref={flatListRef}
          data={images}
          keyExtractor={(item, index) => `${item}-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          initialScrollIndex={Math.max(0, Math.min(initialIndex, images.length - 1))}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width: screenWidth, height: screenHeight }]}>
              <Image
                source={{ uri: item }}
                style={styles.fullImage}
                contentFit="contain"
                transition={200}
              />
            </View>
          )}
        />

        {/* Top Header Controls */}
        <View
          style={[
            styles.headerBar,
            {
              paddingTop: Math.max(insets.top + 8, 16),
              paddingHorizontal: 16,
            },
          ]}
        >
          {/* Close button */}
          <AnimatedButton
            onPress={onClose}
            hapticFeedback="light"
            style={styles.iconButton}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </AnimatedButton>

          {/* Counter Badge */}
          {images.length > 1 && (
            <View style={styles.counterPill}>
              <Typography variant="caption" weight="bold" color="#FFFFFF">
                {currentIndex + 1} / {images.length}
              </Typography>
            </View>
          )}

          {/* Right Action: Optional + Photo for author */}
          {canAddPhoto && onAddPhoto ? (
            <AnimatedButton
              onPress={onAddPhoto}
              disabled={uploadingPhoto}
              hapticFeedback="medium"
              style={[styles.iconButton, styles.addPhotoBtn]}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.addPhotoInner}>
                  <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
                  <Typography variant="caption" weight="bold" color="#FFFFFF" style={{ fontSize: 11 }}>
                    + Photo
                  </Typography>
                </View>
              )}
            </AnimatedButton>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* Left / Right Chevron Navigation Controls (visible when multiple images) */}
        {images.length > 1 && (
          <>
            {currentIndex > 0 && (
              <TouchableOpacity
                style={[styles.navChevron, styles.navChevronLeft]}
                onPress={goToPrev}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {currentIndex < images.length - 1 && (
              <TouchableOpacity
                style={[styles.navChevron, styles.navChevronRight]}
                onPress={goToNext}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Bottom Pagination Dots */}
        {images.length > 1 && (
          <View
            style={[
              styles.footer,
              {
                paddingBottom: Math.max(insets.bottom + 16, 24),
              },
            ]}
          >
            <View style={styles.dotsRow}>
              {images.map((_, i) => (
                <TouchableOpacity
                  key={`dot-${i}`}
                  onPress={() => {
                    setCurrentIndex(i);
                    flatListRef.current?.scrollToIndex({ index: i, animated: true });
                  }}
                >
                  <View
                    style={[
                      styles.dot,
                      i === currentIndex ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  slide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  addPhotoBtn: {
    width: 'auto',
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  addPhotoInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navChevron: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 44,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  navChevronLeft: {
    left: 12,
  },
  navChevronRight: {
    right: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
});
