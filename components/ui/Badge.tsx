import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { Typography } from './Typography';
import { useTheme } from '@/theme';

interface BadgeProps extends ViewProps {
  label: string;
  variant?: 'primary' | 'warning' | 'danger' | 'default';
  size?: 'sm' | 'md';
}

export function Badge({ label, variant = 'default', size = 'sm', style, ...props }: BadgeProps) {
  const { colors, radii, spacing } = useTheme();

  const getColors = () => {
    switch (variant) {
      case 'primary': return { bg: colors.primaryMuted, text: colors.primary };
      case 'warning': return { bg: colors.warningMuted, text: colors.warning };
      case 'danger': return { bg: colors.dangerMuted, text: colors.danger };
      default: return { bg: colors.border, text: colors.textMuted };
    }
  };

  const themeColors = getColors();
  
  const paddingVertical = size === 'sm' ? 2 : 4;
  const paddingHorizontal = size === 'sm' ? spacing.sm : spacing.md;

  return (
    <View
      style={[
        {
          backgroundColor: themeColors.bg,
          borderRadius: radii.full,
          paddingVertical,
          paddingHorizontal,
          alignSelf: 'flex-start',
        },
        style,
      ]}
      {...props}
    >
      <Typography
        variant="caption"
        weight="bold"
        color={themeColors.text}
        style={size === 'sm' ? { fontSize: 10 } : undefined}
      >
        {label}
      </Typography>
    </View>
  );
}
