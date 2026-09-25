import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import { BookmarkableItem } from '@/types';
import { useBookmarkStore } from '@/store/bookmarkStore';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';

interface BookmarkButtonProps {
  item: BookmarkableItem;
  variant?: 'badge' | 'header' | 'plain';
  size?: number;
  activeColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function BookmarkButton({
  item,
  variant = 'badge',
  size = 20,
  activeColor,
  style,
}: BookmarkButtonProps) {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const isBookmarked = useBookmarkStore((s) => Boolean(s.bookmarkedIds[item.targetId]));
  const toggleBookmark = useBookmarkStore((s) => s.toggleBookmark);

  const scale = useSharedValue(1);


  const handlePress = async (e: any) => {
    e.stopPropagation?.();

    // Spring bounce micro-interaction
    scale.value = withSequence(
      withSpring(0.78, { damping: 10, stiffness: 200 }),
      withSpring(1.22, { damping: 8, stiffness: 180 }),
      withSpring(1, { damping: 12, stiffness: 120 })
    );

    await toggleBookmark(item, user?.uid);
  };

  const resolvedActiveColor = activeColor || colors.primary;

  if (variant === 'badge') {
    return (
      <Animated.View style={[styles.badgeContainer, style]}>
        <Pressable
          onPress={handlePress}
          hitSlop={8}
          style={({ pressed }) => [styles.badgePressable, pressed && { opacity: 0.85 }]}
        >
          <BlurView intensity={35} tint="dark" style={styles.blurWrap}>
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={size}
              color={isBookmarked ? resolvedActiveColor : '#FFFFFF'}
            />
          </BlurView>
        </Pressable>
      </Animated.View>
    );
  }

  if (variant === 'header') {
    return (
      <Animated.View style={[style]}>
        <Pressable
          onPress={handlePress}
          hitSlop={10}
          style={({ pressed }) => [
            styles.headerBtn,
            { backgroundColor: colors.background, borderColor: colors.border },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={size}
            color={isBookmarked ? resolvedActiveColor : colors.text}
          />
        </Pressable>
      </Animated.View>
    );
  }

  // Plain variant
  return (
    <Animated.View style={[style]}>
      <Pressable
        onPress={handlePress}
        hitSlop={8}
        style={({ pressed }) => [styles.plainBtn, pressed && { opacity: 0.75 }]}
      >
        <Ionicons
          name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
          size={size}
          color={isBookmarked ? resolvedActiveColor : colors.textMuted}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  badgePressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurWrap: {
    width: 34,
    height: 34,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },

  plainBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
