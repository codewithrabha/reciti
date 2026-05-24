import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Notification } from '@/types';
import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from '@/lib/db';
import { useUser } from '@/hooks/useAuth';
import { NotificationRow } from '@/components/notifications/NotificationRow';
import { NotificationRowSkeleton } from '@/components/skeletons';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { StateView } from '@/components/ui/StateView';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useUser();
  const { colors, spacing } = useTheme();
  const [notifications, setNotifications] = useState<Notification[] | undefined>(undefined);

  useEffect(() => {
    if (!user || user.isAnonymous) {
      setNotifications([]);
      return;
    }
    return subscribeToNotifications(user.uid, setNotifications);
  }, [user]);

  const unreadCount = (notifications ?? []).filter((n) => !n.read).length;

  const handleTap = async (n: Notification) => {
    if (!user || user.isAnonymous) return;
    if (!n.read) {
      markNotificationRead(user.uid, n.notifId).catch(() => {});
    }
    router.push({ pathname: '/report/[id]', params: { id: n.reportId } });
  };

  const handleMarkAllRead = () => {
    if (!user || user.isAnonymous || unreadCount === 0) return;
    markAllNotificationsRead(user.uid).catch(() => {});
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AnimatedButton
          onPress={() => router.back()}
          hapticFeedback="light"
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </AnimatedButton>
        <Typography variant="h3" weight="bold" style={{ flex: 1 }}>
          Notifications
        </Typography>
        <AnimatedButton
          onPress={handleMarkAllRead}
          hapticFeedback={unreadCount > 0 ? 'light' : 'none'}
          disabled={unreadCount === 0}
          style={styles.markAllBtn}
        >
          <Typography
            variant="caption"
            weight="semiBold"
            color={unreadCount > 0 ? colors.primary : colors.textMuted}
          >
            Mark all read
          </Typography>
        </AnimatedButton>
      </View>

      {/* Body */}
      {notifications === undefined ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}
        >
          <NotificationRowSkeleton count={6} />
        </Animated.View>
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <StateView
            icon="notifications-off-outline"
            title="No notifications yet"
            message="When neighbours verify, comment, or confirm your reports, you'll see updates here."
          />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.notifId}
          renderItem={({ item }) => (
            <NotificationRow notification={item} onPress={() => handleTap(item)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  list: {
    padding: 16,
    paddingBottom: 120,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
