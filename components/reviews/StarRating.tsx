import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface StarRatingProps {
  rating: number; // 0 to 5 (e.g. 4.3 or 5)
  maxStars?: number;
  size?: number;
  color?: string;
  emptyColor?: string;
  interactive?: boolean;
  onRate?: (rating: number) => void;
  style?: ViewStyle;
}

export function StarRating({
  rating,
  maxStars = 5,
  size = 18,
  color = '#F59E0B',
  emptyColor = '#CBD5E1',
  interactive = false,
  onRate,
  style,
}: StarRatingProps) {
  const handlePress = (selectedStar: number) => {
    if (!interactive || !onRate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onRate(selectedStar);
  };

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: maxStars }).map((_, index) => {
        const starNumber = index + 1;
        let iconName: 'star' | 'star-half' | 'star-outline' = 'star-outline';
        let starColor = emptyColor;

        if (interactive) {
          if (rating >= starNumber) {
            iconName = 'star';
            starColor = color;
          }
        } else {
          const diff = rating - index;
          if (diff >= 0.75) {
            iconName = 'star';
            starColor = color;
          } else if (diff >= 0.25) {
            iconName = 'star-half';
            starColor = color;
          } else {
            iconName = 'star-outline';
            starColor = emptyColor;
          }
        }

        if (interactive) {
          return (
            <Pressable
              key={index}
              onPress={() => handlePress(starNumber)}
              hitSlop={6}
              style={({ pressed }) => [
                styles.interactiveStar,
                { transform: [{ scale: pressed ? 0.88 : 1 }] },
              ]}
            >
              <Ionicons name={iconName} size={size} color={starColor} />
            </Pressable>
          );
        }

        return (
          <Ionicons
            key={index}
            name={iconName}
            size={size}
            color={starColor}
            style={styles.staticStar}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  interactiveStar: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  staticStar: {
    marginRight: 2,
  },
});
