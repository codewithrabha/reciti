import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

interface OnboardingSlideProps {
  width: number;
  height: number;
  index: number;
  scrollX: SharedValue<number>;
  visual: React.ReactNode;
  headline: string;
  body: string;
}

export function OnboardingSlide({
  width,
  height,
  index,
  scrollX,
  visual,
  headline,
  body,
}: OnboardingSlideProps) {
  const { colors, spacing } = useTheme();

  const visualStyle = useAnimatedStyle(() => {
    const progress = scrollX.value / width;
    const opacity = interpolate(
      progress,
      [index - 0.6, index, index + 0.6],
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      progress,
      [index - 1, index, index + 1],
      [0.6, 1, 0.6],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ scale }] };
  });

  const textStyle = useAnimatedStyle(() => {
    const progress = scrollX.value / width;
    const opacity = interpolate(
      progress,
      [index - 0.5, index, index + 0.5],
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      progress,
      [index - 1, index, index + 1],
      [28, 0, 28],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ translateY }] };
  });

  return (
    <View style={[styles.slide, { width, height }]}>
      <Animated.View style={[styles.visual, visualStyle]}>
        {visual}
      </Animated.View>
      <Animated.View style={textStyle}>
        <Typography
          variant="h1"
          align="center"
          style={{ marginBottom: spacing.md }}
        >
          {headline}
        </Typography>
        <Typography
          variant="subtitle"
          weight="regular"
          align="center"
          color={colors.textMuted}
        >
          {body}
        </Typography>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  visual: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
});
