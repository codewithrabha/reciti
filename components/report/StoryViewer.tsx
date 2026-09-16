import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
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
  reporterName?: string | null;
  reporterPhotoURL?: string | null;
  onClose: () => void;
}

export function StoryViewer({
  slides,
  initialIndex = 0,
  reportId,
  ownerUid,
  currentUid,
  reporterName,
  reporterPhotoURL,
  onClose,
}: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, Math.min(initialIndex, slides.length - 1)),
  );
  const [deleting, setDeleting] = useState(false);

  const isOwner = !!currentUid && currentUid === ownerUid;

  // One animated value per slide for progress bars
  const progressAnims = useRef(slides.map(() => new Animated.Value(0))).current;
  const timerRef = useRef<ReturnType<typeof Animated.timing> | null>(null);
  const currentProgress = useRef(0);
  const isPaused = useRef(false);

  // Set completed bars for earlier slides and reset later slides
  useEffect(() => {
    slides.forEach((_, i) => {
      if (i < currentIndex) {
        progressAnims[i]?.setValue(1);
      } else if (i > currentIndex) {
        progressAnims[i]?.setValue(0);
      }
    });
  }, [currentIndex, slides, progressAnims]);

  const advance = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= slides.length - 1) {
        setTimeout(onClose, 300);
        return prev;
      }
      return prev + 1;
    });
  }, [slides.length, onClose]);

  // Start progress animation
  const startProgress = useCallback(
    (fromValue = 0) => {
      timerRef.current?.stop();
      currentProgress.current = fromValue;
      progressAnims[currentIndex]?.setValue(fromValue);

      const remainingDuration = SLIDE_DURATION * (1 - fromValue);

      timerRef.current = Animated.timing(progressAnims[currentIndex], {
        toValue: 1,
        duration: remainingDuration,
        useNativeDriver: false,
      });

      timerRef.current.start(({ finished }) => {
        if (finished && !isPaused.current) {
          advance();
        }
      });
    },
    [currentIndex, advance, progressAnims],
  );

  // Animate whenever currentIndex changes
  useEffect(() => {
    isPaused.current = false;
    startProgress(0);

    const animListener = progressAnims[currentIndex]?.addListener(({ value }) => {
      currentProgress.current = value;
    });

    return () => {
      timerRef.current?.stop();
      if (animListener) {
        progressAnims[currentIndex]?.removeListener(animListener);
      }
    };
  }, [currentIndex, startProgress, progressAnims]);

  const pause = () => {
    isPaused.current = true;
    timerRef.current?.stop();
  };

  const resume = () => {
    if (isPaused.current) {
      isPaused.current = false;
      startProgress(currentProgress.current);
    }
  };

  const goToPrev = () => {
    timerRef.current?.stop();
    if (currentIndex > 0) {
      progressAnims[currentIndex]?.setValue(0);
      progressAnims[currentIndex - 1]?.setValue(0);
      setCurrentIndex(currentIndex - 1);
    } else {
      // Replay current slide
      startProgress(0);
    }
  };

  const goToNext = () => {
    timerRef.current?.stop();
    if (currentIndex < slides.length - 1) {
      progressAnims[currentIndex]?.setValue(1);
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handleDelete = () => {
    const slide = slides[currentIndex];
    pause();
    Alert.alert('Delete update', 'Remove this slide permanently? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel', onPress: resume },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteStorySlide(reportId, currentUid!, slide.slideId);
            if (slides.length <= 1) {
              onClose();
            } else if (currentIndex >= slides.length - 1) {
              setCurrentIndex(currentIndex - 1);
            }
          } catch {
            Alert.alert('Error', 'Could not delete this update. Please try again.');
            resume();
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
        {/* Dark scrim — lighter when photo is present */}
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
                        ? progressAnims[i]?.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }) ?? '0%'
                        : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Header - Instagram Style */}
        <View style={styles.header}>
          <View style={styles.authorGroup}>
            {/* Small avatar */}
            <View style={styles.headerAvatarRing}>
              {reporterPhotoURL ? (
                <Image
                  source={{ uri: reporterPhotoURL }}
                  style={styles.headerAvatarImg}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.headerAvatarPlaceholder}>
                  <Ionicons name="person" size={13} color="#FFFFFF" />
                </View>
              )}
            </View>

            <View style={styles.headerTextCol}>
              <View style={styles.headerNameRow}>
                <Typography variant="caption" weight="bold" color="#FFFFFF" numberOfLines={1}>
                  {reporterName || 'Reporter'}
                </Typography>
                <Typography variant="caption" color="rgba(255,255,255,0.7)">
                  · {formatDistanceToNow(slide.createdAt.toDate(), { addSuffix: false })}
                </Typography>
              </View>
              <Typography variant="caption" color="rgba(255,255,255,0.6)" style={{ fontSize: 10 }}>
                Update {currentIndex + 1} of {slides.length}
              </Typography>
            </View>
          </View>

          <View style={styles.headerActions}>
            {isOwner && (
              <AnimatedButton
                onPress={handleDelete}
                disabled={deleting}
                hapticFeedback="medium"
                style={styles.iconBtn}
              >
                <Ionicons name="trash-outline" size={19} color="rgba(255,255,255,0.85)" />
              </AnimatedButton>
            )}
            <AnimatedButton onPress={onClose} hapticFeedback="light" style={styles.iconBtn}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </AnimatedButton>
          </View>
        </View>

        {/* Interactive Tap Zones: Hold to pause, Tap to skip */}
        <View style={styles.tapZones}>
          <Pressable
            style={styles.tapHalf}
            onPressIn={pause}
            onPressOut={resume}
            onPress={goToPrev}
          />
          <Pressable
            style={styles.tapHalf}
            onPressIn={pause}
            onPressOut={resume}
            onPress={goToNext}
          />
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
    paddingTop: 56, // clears status bar
    gap: 4,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.35)',
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
    zIndex: 10,
  },
  authorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerAvatarRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  headerAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    justifyContent: 'center',
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    top: 100,
    bottom: 180,
  },
  tapHalf: {
    flex: 1,
  },
  contentArea: {
    position: 'absolute',
    bottom: 72,
    left: 24,
    right: 24,
  },
  slideText: {
    fontSize: 19,
    lineHeight: 28,
    letterSpacing: 0.15,
  },
});
