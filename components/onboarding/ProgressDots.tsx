import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';

interface ProgressDotsProps {
  count: number;
  scrollX: SharedValue<number>;
  slideWidth: number;
}

function Dot({
  index,
  scrollX,
  slideWidth,
}: {
  index: number;
  scrollX: SharedValue<number>;
  slideWidth: number;
}) {
  const { colors } = useTheme();

  const style = useAnimatedStyle(() => {
    const progress = scrollX.value / slideWidth;
    const width = interpolate(
      progress,
      [index - 1, index, index + 1],
      [8, 24, 8],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      progress,
      [index - 1, index, index + 1],
      [0.25, 1, 0.25],
      Extrapolation.CLAMP,
    );
    return { width, opacity };
  });

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: colors.primary }, style]}
    />
  );
}

export function ProgressDots({ count, scrollX, slideWidth }: ProgressDotsProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <Dot key={i} index={i} scrollX={scrollX} slideWidth={slideWidth} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});
