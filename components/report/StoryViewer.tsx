import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

import { StorySlide } from '@/types';
import { deleteStorySlide } from '@/lib/db';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

/** Duration each slide stays visible before auto-advancing (ms). */
const SLIDE_DURATION = 4000;

interface StoryViewerProps {
  slides: StorySlide[];
  initialIndex?: number;
  reportId: string;
  ownerUid: string | null;
  /** UID of the currently signed-in user (null = anonymous). */
  currentUid: string | null;
  onClose: () => void;
}

export function StoryViewer({
  slides,
  initialIndex = 0,
  reportId,
  ownerUid,
  currentUid,
  onClose,
}: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [deleting, setDeleting] = useState(false);

  const isOwner = !!currentUid && currentUid === ownerUid;

  // One animated value per slide for the progress bars.
  const progressAnims = useRef(slides.map(() => new Animated.Value(0))).current;
  const timerRef = useRef<ReturnType<typeof Animated.timing> | null>(null);

  const advance = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= slides.length - 1) {
        // Last slide finished — close after brief pause.
        setTimeout(onClose, 400);
        return prev;
      }
      return prev + 1;
    });
  }, [slides.length, onClose]);

  // Start / reset the animated progress bar whenever the active slide changes.
  useEffect(() => {
    progressAnims[currentIndex].setValue(0);

    timerRef.current = Animated.timing(progressAnims[currentIndex], {
      toValue: 1,
      duration: SLIDE_DURATION,
      useNativeDriver: false,
    });
    timerRef.current.start(({ finished }) => {
      if (finished) advance();
    });

    return () => {
      timerRef.current?.stop();
    };
  }, [currentIndex, advance, progressAnims]);

  const goToPrev = () => {
    timerRef.current?.stop();
    if (currentIndex > 0) {
      progressAnims[currentIndex].setValue(0);
      progressAnims[currentIndex - 1].setValue(0);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    timerRef.current?.stop();
    if (currentIndex < slides.length - 1) {
      progressAnims[currentIndex].setValue(1);
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handleDelete = () => {
    const slide = slides[currentIndex];
    Alert.alert('Delete update', 'Remove this slide permanently? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteStorySlide(reportId, currentUid!, slide.slideId);
            if (slides.length === 1) {
              onClose();
            } else if (currentIndex >= slides.length - 1) {
              setCurrentIndex(currentIndex - 1);
            }
            // The parent's real-time subscription will shrink the slides array.
          } catch {
            Alert.alert('Error', 'Could not delete this update. Please try again.');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const slide = slides[currentIndex];
  if (!slide) return null;

  const hasPhoto = !!slide.imageUrl;

  return (
    <Modal
      visible
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.shell}>
        {/* Background photo */}
        {hasPhoto && (
          <Image
            source={{ uri: slide.imageUrl! }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        )}
        {/* Dark scrim — lighter when there's a photo so image shows through */}
        <View style={[styles.scrim, hasPhoto && styles.scrimLight]} />

        {/* Progress bars */}
        <View style={styles.progressRow}>
          {slides.map((_, i) => (
            <View key={i} style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      i < currentIndex
                        ? '100%'
                        : i === currentIndex
                        ? progressAnims[i].interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          })
                        : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.slideLabel}>
            <Ionicons name="megaphone" size={13} color="rgba(255,255,255,0.75)" />
            <Typography
              variant="caption"
              color="rgba(255,255,255,0.75)"
              style={{ marginLeft: 5 }}
            >
              Update {currentIndex + 1} of {slides.length}
            </Typography>
          </View>
          <View style={styles.headerActions}>
            {isOwner && (
              <AnimatedButton
                onPress={handleDelete}
                disabled={deleting}
                hapticFeedback="medium"
                style={styles.iconBtn}
              >
                <Ionicons name="trash-outline" size={20} color="rgba(255,255,255,0.85)" />
              </AnimatedButton>
            )}
            <AnimatedButton onPress={onClose} hapticFeedback="light" style={styles.iconBtn}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </AnimatedButton>
          </View>
        </View>

        {/* Tap zones — transparent overlays for prev / next */}
        <View style={styles.tapZones} pointerEvents="box-none">
          <TouchableWithoutFeedback onPress={goToPrev}>
            <View style={styles.tapHalf} />
          </TouchableWithoutFeedback>
          <TouchableWithoutFeedback onPress={goToNext}>
            <View style={styles.tapHalf} />
          </TouchableWithoutFeedback>
        </View>

        {/* Slide content — bottom-anchored */}
        <View style={styles.contentArea} pointerEvents="none">
          <Typography variant="body" weight="semiBold" color="#FFFFFF" style={styles.slideText}>
            {slide.text}
          </Typography>
          <Typography
            variant="caption"
            color="rgba(255,255,255,0.55)"
            style={{ marginTop: 6 }}
          >
            {formatDistanceToNow(slide.createdAt.toDate(), { addSuffix: true })}
          </Typography>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  scrimLight: {
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  progressRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 56, // clears status bar on most devices
    gap: 4,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  slideLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    top: 100,
    bottom: 180,
  },
  tapHalf: { flex: 1 },
  contentArea: {
    position: 'absolute',
    bottom: 72,
    left: 24,
    right: 24,
  },
  slideText: {
    fontSize: 20,
    lineHeight: 30,
    letterSpacing: 0.15,
  },
});
