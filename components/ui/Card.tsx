import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'elevated' | 'outlined' | 'flat';
}

export function Card({
  children,
  style,
  padding = 'md',
  variant = 'elevated',
  ...props
}: CardProps) {
  const { colors, spacing, radii, shadows } = useTheme();

  const getPadding = () => {
    switch (padding) {
      case 'none': return 0;
      case 'sm': return spacing.sm;
      case 'md': return spacing.md;
      case 'lg': return spacing.lg;
      default: return spacing.md;
    }
  };

  const wrapperStyle = [
    styles.wrapper,
    variant === 'elevated' && shadows.sm,
    style, // We apply the outer style (like margins) to the wrapper
  ];

  const innerStyle = [
    styles.inner,
    {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: getPadding(),
    },
    variant === 'outlined' && { borderWidth: 1, borderColor: colors.border },
  ];

  return (
    <View style={wrapperStyle} {...props}>
      <View style={innerStyle}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
  },
  inner: {
    overflow: 'hidden',
  },
});
