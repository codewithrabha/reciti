import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

import { Notification, NotificationType } from '@/types';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

interface Props {
  notification: Notification;
  onPress: () => void;
}

type IconSpec = { icon: keyof typeof Ionicons.glyphMap; tone: 'primary' | 'danger' | 'warning' };

const ICON_BY_TYPE: Record<NotificationType, IconSpec> = {
  report_verified: { icon: 'checkmark-circle', tone: 'primary' },
  comment_added: { icon: 'chatbubble', tone: 'primary' },
  fix_submitted: { icon: 'construct', tone: 'warning' },
  fix_confirmed: { icon: 'sparkles', tone: 'primary' },
};

function buildTitle(n: Notification): string {
  const from = n.fromIsAnonymous || !n.fromDisplayName ? 'A neighbour' : n.fromDisplayName;
  switch (n.type) {
    case 'report_verified':
      return 'Your report was verified by the community';
    case 'comment_added':
      return `${from} commented on your report`;
    case 'fix_submitted':
      return 'A fix was submitted on a report you verified';
    case 'fix_confirmed':
      return 'Your report has been marked resolved';
  }
}

export const NotificationRow = React.memo(function NotificationRow({
  notification,
  onPress,
}: Props) {
  const { colors, radii, spacing } = useTheme();
  const spec = ICON_BY_TYPE[notification.type];

  const tintMap = {
    primary: { bg: colors.primaryMuted, fg: colors.primary },
    danger: { bg: colors.dangerMuted, fg: colors.danger },
    warning: { bg: colors.warningMuted, fg: colors.warning },
  } as const;
  const c = tintMap[spec.tone];

  const title = buildTitle(notification);
  const sub = notification.type === 'comment_added' ? notification.commentPreview : null;
  const time = formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true });

  return (
    <AnimatedButton
      onPress={onPress}
      hapticFeedback="light"
      scaleTo={0.99}
      style={[
        styles.row,
        {
          borderRadius: radii.md,
          backgroundColor: notification.read ? colors.surface : colors.primaryMuted,
          borderColor: colors.border,
          borderWidth: 1,
        },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: c.bg }]}>
        <Ionicons name={spec.icon} size={18} color={c.fg} />
      </View>
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <Typography variant="body" weight={notification.read ? 'medium' : 'semiBold'} numberOfLines={2}>
          {title}
        </Typography>
        {sub ? (
          <Typography
            variant="caption"
            color={colors.textMuted}
            numberOfLines={2}
            style={{ marginTop: 2 }}
          >
            “{sub}”
          </Typography>
        ) : null}
        <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 4 }}>
          {time}
        </Typography>
      </View>
      {!notification.read && (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      )}
    </AnimatedButton>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    marginBottom: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 6,
  },
});
