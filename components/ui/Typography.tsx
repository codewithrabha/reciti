import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme } from '@/theme';

interface TypographyProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'subtitle' | 'body' | 'caption';
  color?: string;
  weight?: 'regular' | 'medium' | 'semiBold' | 'bold';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export function Typography({
  style,
  variant = 'body',
  color,
  weight,
  align = 'left',
  ...props
}: TypographyProps) {
  const { colors, typography } = useTheme();

  // Determine font family based on weight or variant
  let fontFamily = typography.family.regular;
  if (weight === 'medium') fontFamily = typography.family.medium;
  else if (weight === 'semiBold') fontFamily = typography.family.semiBold;
  else if (weight === 'bold') fontFamily = typography.family.bold;
  else {
    // Default weights by variant
    if (variant.startsWith('h')) fontFamily = typography.family.bold;
    if (variant === 'subtitle') fontFamily = typography.family.semiBold;
  }

  // Determine font size by variant
  let fontSize = typography.size.md;
  if (variant === 'h1') fontSize = typography.size.xxxl;
  if (variant === 'h2') fontSize = typography.size.xxl;
  if (variant === 'h3') fontSize = typography.size.xl;
  if (variant === 'subtitle') fontSize = typography.size.lg;
  if (variant === 'caption') fontSize = typography.size.sm;

  return (
    <Text
      style={[
        {
          fontFamily,
          fontSize,
          lineHeight: variant.startsWith('h') ? fontSize * 1.2 : fontSize * 1.5,
          color: color || colors.text,
          textAlign: align,
        },
        style,
      ]}
      {...props}
    />
  );
}
