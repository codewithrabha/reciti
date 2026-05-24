import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Typography } from '@/components/ui/Typography';
import { useUser } from '@/hooks/useAuth';
import { subscribeToUnreadNotifCount } from '@/lib/db';
import { useTheme } from '@/theme';

export function NotificationBell() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useUser();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user || user.isAnonymous) {
      setUnread(0);
      return;
    }
    return subscribeToUnreadNotifCount(user.uid, setUnread);
  }, [user]);

  if (!user || user.isAnonymous) return null;

  const label = unread > 99 ? '99+' : String(unread);

  return (
    <AnimatedButton
      onPress={() => router.push('/notifications')}
      hapticFeedback="light"
      style={styles.button}
      accessibilityLabel={unread > 0 ? `${label} unread notifications` : 'Notifications'}
    >
      <Ionicons name="notifications-outline" size={24} color={colors.text} />
      {unread > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.background }]}>
          <Typography variant="caption" weight="bold" color={colors.white} style={styles.badgeText}>
            {label}
          </Typography>
        </View>
      )}
    </AnimatedButton>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
  },
});
