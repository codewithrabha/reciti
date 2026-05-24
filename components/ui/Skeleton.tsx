import React, { useEffect, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme';

type SkeletonWidth = number | `${number}%`;

interface SkeletonProps {
  width?: SkeletonWidth;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width, height, borderRadius, style }: SkeletonProps) {
  const { colors, radii } = useTheme();
  const [boxWidth, setBoxWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -boxWidth + progress.value * boxWidth * 2 }],
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    if (next !== boxWidth) setBoxWidth(next);
  };

  return (
    <View
      onLayout={onLayout}
      style={[
        {
          width: width as ViewStyle['width'],
          height,
          backgroundColor: colors.border,
          borderRadius: borderRadius ?? radii.sm,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {boxWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { width: boxWidth },
            animatedStyle,
          ]}
        >
          <LinearGradient
            colors={['transparent', colors.surface, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

interface SkeletonGroupProps {
  count: number;
  gap?: number;
  children: (index: number) => React.ReactNode;
}

export function SkeletonGroup({ count, gap, children }: SkeletonGroupProps) {
  return (
    <View style={gap !== undefined ? { gap } : undefined}>
      {Array.from({ length: count }).map((_, i) => (
        <React.Fragment key={i}>{children(i)}</React.Fragment>
      ))}
    </View>
  );
}
