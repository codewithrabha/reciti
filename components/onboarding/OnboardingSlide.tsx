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
  const { colors, typography } = useTheme();

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
      <Animated.View style={[styles.textContainer, textStyle]}>
        <Typography
          variant="h2"
          align="center"
          style={[styles.headline, { fontFamily: typography.family.display }]}
        >
          {headline}
        </Typography>
        <Typography
          variant="subtitle"
          weight="regular"
          align="center"
          color={colors.textMuted}
          style={styles.body}
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
    paddingHorizontal: 28,
  },
  visual: {
    width: '100%',
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headline: {
    fontSize: 22,
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    paddingHorizontal: 6,
  },
});
