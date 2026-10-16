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
      [7, 26, 7],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      progress,
      [index - 1, index, index + 1],
      [0.35, 1, 0.35],
      Extrapolation.CLAMP,
    );
    return { width, opacity };
  });

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: '#10B981' }, style]}
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
    height: 16,
  },
  dot: {
    height: 7,
    borderRadius: 3.5,
    marginHorizontal: 3.5,
  },
});
