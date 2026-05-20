import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedButtonProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'success' | 'none';
}

export function AnimatedButton({
  children,
  style,
  onPress,
  onPressIn,
  onPressOut,
  scaleTo = 0.99,
  hapticFeedback = 'light',
  ...props
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = (e: any) => {
    scale.value = withSpring(scaleTo, { damping: 15, stiffness: 80 });
    if (onPressIn) onPressIn(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, { damping: 15, stiffness: 80});
    if (onPressOut) onPressOut(e);
  };

  const handlePress = (e: any) => {
    if (hapticFeedback !== 'none') {
      if (hapticFeedback === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const styleMap = {
          light: Haptics.ImpactFeedbackStyle.Light,
          medium: Haptics.ImpactFeedbackStyle.Medium,
          heavy: Haptics.ImpactFeedbackStyle.Heavy,
        };
        Haptics.impactAsync(styleMap[hapticFeedback as keyof typeof styleMap]);
      }
    }
    if (onPress) onPress(e);
  };

  return (
    <AnimatedPressable
      style={[animatedStyle, style]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
