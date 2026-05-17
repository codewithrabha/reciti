import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

interface StateViewProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** 'muted' for empty states, 'error' for failures. */
  tone?: 'muted' | 'error';
  /** Smaller sizing for use inside a card or list. */
  compact?: boolean;
}

/**
 * Shared empty / error state — a centered icon, title, message and optional action.
 * The parent decides layout (flex-fill for full screens, in-flow for cards).
 */
export function StateView({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  tone = 'muted',
  compact = false,
}: StateViewProps) {
  const { colors, radii } = useTheme();
  const iconColor = tone === 'error' ? colors.danger : colors.border;

  return (
    <View style={[styles.wrap, { paddingVertical: compact ? 24 : 44 }]}>
      <Ionicons name={icon} size={compact ? 44 : 60} color={iconColor} />
      <Typography
        variant={compact ? 'body' : 'h3'}
        weight="bold"
        align="center"
        style={styles.title}
      >
        {title}
      </Typography>
      {!!message && (
        <Typography
          variant="caption"
          color={colors.textMuted}
          align="center"
          style={styles.message}
        >
          {message}
        </Typography>
      )}
      {!!actionLabel && !!onAction && (
        <AnimatedButton
          onPress={onAction}
          hapticFeedback="light"
          style={[styles.action, { backgroundColor: colors.primary, borderRadius: radii.md }]}
        >
          <Typography variant="body" weight="bold" color={colors.white}>
            {actionLabel}
          </Typography>
        </AnimatedButton>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 24 },
  title: { marginTop: 14 },
  message: { marginTop: 4, lineHeight: 19 },
  action: { paddingVertical: 12, paddingHorizontal: 26, marginTop: 18 },
});
