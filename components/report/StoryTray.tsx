import React from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';

import { StorySlide } from '@/types';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

/** Instagram's signature sunset gradient colors */
const INSTAGRAM_GRADIENT = ['#F58529', '#DD2A7B', '#8134AF', '#515BD4'] as const;

interface StoryTrayProps {
  slides: StorySlide[];
  isOwner: boolean;
  canCompose: boolean;
  reporterName?: string | null;
  reporterPhotoURL?: string | null;
  onPressSlide: (index: number) => void;
  onPressAdd: () => void;
}

export function StoryTray({
  slides,
  isOwner,
  canCompose,
  reporterName,
  reporterPhotoURL,
  onPressSlide,
  onPressAdd,
}: StoryTrayProps) {
  const { colors } = useTheme();

  const hasSlides = slides.length > 0;
  // If no slides and not the owner, hide entirely
  if (!hasSlides && !isOwner) return null;

  const handleSlidePress = (idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPressSlide(idx);
  };

  const handleAddPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPressAdd();
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Typography
            variant="caption"
            weight="bold"
            color={colors.textMuted}
            style={styles.sectionLabel}
          >
            Stories Update
          </Typography>
          {hasSlides && (
            <View style={[styles.countBadge, { backgroundColor: colors.surface }]}>
              <Typography variant="caption" weight="bold" color={colors.primary}>
                {slides.length} {slides.length === 1 ? 'story' : 'stories'}
              </Typography>
            </View>
          )}
        </View>
      </View>

      {/* Horizontal Stories Tray */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        overScrollMode="never"
      >
        {/* 1. Owner "Your Story / Add update" bubble */}
        {isOwner && canCompose && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleAddPress}
            style={styles.storyItem}
          >
            <View style={styles.avatarWrapper}>
              {/* Outer ring */}
              <View
                style={[
                  styles.addRing,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                {reporterPhotoURL ? (
                  <Image
                    source={{ uri: reporterPhotoURL }}
                    style={styles.avatarImg}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                    <Ionicons name="person" size={24} color={colors.textMuted} />
                  </View>
                )}
              </View>

              {/* Instagram-style blue '+' badge */}
              <View
                style={[
                  styles.plusBadge,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.background,
                  },
                ]}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />
              </View>
            </View>

            <Typography
              variant="caption"
              weight="semiBold"
              numberOfLines={1}
              align="center"
              style={styles.storyLabel}
            >
              Add update
            </Typography>
            <Typography
              variant="caption"
              color={colors.textMuted}
              numberOfLines={1}
              align="center"
              style={styles.storySubLabel}
            >
              New story
            </Typography>
          </TouchableOpacity>
        )}

        {/* 2. Slide Stories with Instagram Gradient Rings */}
        {slides.map((slide, index) => {
          const hasPhoto = !!slide.imageUrl;
          const label = `Update ${index + 1}`;
          const timeAgo = formatDistanceToNow(slide.createdAt.toDate(), { addSuffix: false });

          return (
            <TouchableOpacity
              key={slide.slideId}
              activeOpacity={0.8}
              onPress={() => handleSlidePress(index)}
              style={styles.storyItem}
            >
              <View style={styles.avatarWrapper}>
                {/* Gradient Ring */}
                <LinearGradient
                  colors={INSTAGRAM_GRADIENT}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientRing}
                >
                  {/* Background gap spacer */}
                  <View
                    style={[
                      styles.ringGap,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    {hasPhoto ? (
                      <Image
                        source={{ uri: slide.imageUrl! }}
                        style={styles.avatarImg}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <LinearGradient
                        colors={[colors.primary, colors.primaryMuted]}
                        style={[styles.avatarPlaceholder, { width: '100%', height: '100%' }]}
                      >
                        <Ionicons name="megaphone" size={20} color="#FFFFFF" />
                      </LinearGradient>
                    )}
                  </View>
                </LinearGradient>
              </View>

              <Typography
                variant="caption"
                weight="semiBold"
                numberOfLines={1}
                align="center"
                style={styles.storyLabel}
              >
                {label}
              </Typography>
              <Typography
                variant="caption"
                color={colors.textMuted}
                numberOfLines={1}
                align="center"
                style={styles.storySubLabel}
              >
                {timeAgo}
              </Typography>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionLabel: {
    letterSpacing: 0.8,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  storyItem: {
    width: 72,
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gradientRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringGap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  addRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 29,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyLabel: {
    marginTop: 6,
    width: '100%',
    fontSize: 11,
  },
  storySubLabel: {
    fontSize: 10,
    marginTop: 1,
  },
});
