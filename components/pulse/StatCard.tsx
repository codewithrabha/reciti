import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

type Tint = 'primary' | 'danger' | 'warning';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: number | string;
  label: string;
  tint?: Tint;
  onPress?: () => void;
}

export function StatCard({ icon, value, label, tint = 'primary', onPress }: StatCardProps) {
  const { colors, radii, shadows } = useTheme();

  const tintMap: Record<Tint, { bg: string; fg: string }> = {
    primary: { bg: colors.primaryMuted, fg: colors.primary },
    danger: { bg: colors.dangerMuted, fg: colors.danger },
    warning: { bg: colors.warningMuted, fg: colors.warning },
  };
  const c = tintMap[tint];

  const cardStyle = [
    styles.card,
    { backgroundColor: colors.surface, borderRadius: radii.lg },
    shadows.sm,
  ];

  const content = (
    <>
      <View style={[styles.iconCircle, { backgroundColor: c.bg }]}>
        <Ionicons name={icon} size={18} color={c.fg} />
      </View>
      <Typography variant="h2" weight="bold">
        {value}
      </Typography>
      <Typography variant="caption" weight="medium" color={colors.textMuted}>
        {label}
      </Typography>
    </>
  );

  if (onPress) {
    return (
      <AnimatedButton onPress={onPress} hapticFeedback="light" style={cardStyle}>
        {content}
      </AnimatedButton>
    );
  }
  return <View style={cardStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  card: { flex: 1, padding: 16 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
});
