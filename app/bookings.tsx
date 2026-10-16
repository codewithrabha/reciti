import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ServiceBooking, BookingStatus } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { StateView } from '@/components/ui/StateView';
import { useUser } from '@/hooks/useAuth';
import { subscribeUserBookings, cancelBooking } from '@/lib/serviceBookingService';

const STATUS_VARIANT: Record<BookingStatus, 'primary' | 'warning' | 'danger' | 'default'> = {
  pending: 'warning',
  confirmed: 'primary',
  completed: 'default',
  cancelled: 'danger',
  rejected: 'danger',
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'PENDING',
  confirmed: 'CONFIRMED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  rejected: 'DECLINED',
};

export default function MyBookingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const user = useUser();

  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'past'>('all');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsub = subscribeUserBookings(user.uid, (list) => {
      setBookings(list);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleCancel = (booking: ServiceBooking) => {
    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel your appointment for "${booking.serviceTitle}"?`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user) return;
              await cancelBooking(booking.id, user.uid);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not cancel booking.');
            }
          },
        },
      ]
    );
  };

  const handleCallProvider = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Cannot Call', 'Phone dialer could not be opened.');
    });
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'active') {
      return b.status === 'pending' || b.status === 'confirmed';
    }
    if (filter === 'past') {
      return b.status === 'completed' || b.status === 'cancelled' || b.status === 'rejected';
    }
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Navigation Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AnimatedButton
          onPress={() => router.back()}
          style={[styles.circleButton, { backgroundColor: colors.surface }]}
          hapticFeedback="light"
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </AnimatedButton>
        <Typography variant="h2" style={{ fontSize: 18, fontWeight: '800', marginLeft: 12, flex: 1 }}>
          My Bookings
        </Typography>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {(['all', 'active', 'past'] as const).map((tab) => {
          const isActive = filter === tab;
          const label = tab === 'all' ? 'All' : tab === 'active' ? 'Upcoming' : 'Past';
          return (
            <AnimatedButton
              key={tab}
              onPress={() => setFilter(tab)}
              style={[
                styles.filterTab,
                isActive && { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' },
              ]}
              hapticFeedback="light"
            >
              <Typography
                variant="caption"
                weight={isActive ? 'bold' : 'regular'}
                style={{ color: isActive ? colors.primary : colors.textMuted, fontSize: 13 }}
              >
                {label}
              </Typography>
            </AnimatedButton>
          );
        })}
      </View>

      {/* Bookings List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {!user ? (
          <StateView
            icon="person"
            title="Sign in to View Bookings"
            message="Please sign in to track your service bookings and appointment schedule."
            actionLabel="Sign In"
            onAction={() => router.push('/auth/login' as any)}
          />
        ) : filteredBookings.length === 0 && !loading ? (
          <StateView
            icon="calendar"
            title="No Bookings Found"
            message={
              filter === 'active'
                ? 'You have no active or upcoming bookings.'
                : 'You have not booked any services yet. Explore categories to find bookable services!'
            }
            actionLabel="Explore Categories"
            onAction={() => router.push('/directories' as any)}
          />
        ) : (
          filteredBookings.map((b) => {
            const canCancel = b.status === 'pending' || b.status === 'confirmed';
            return (
              <View
                key={b.id}
                style={[
                  styles.bookingCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                {/* Top Row: Title + Status Badge */}
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Typography variant="h3" style={{ fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
                      {b.serviceTitle}
                    </Typography>
                    <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                      {b.providerName}
                    </Typography>
                  </View>
                  <Badge label={STATUS_LABEL[b.status]} variant={STATUS_VARIANT[b.status]} />
                </View>

                {/* Details Row: Date, Slot & Price */}
                <View style={[styles.detailsBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                    <Typography variant="caption" weight="bold" style={{ marginLeft: 5, fontSize: 12 }}>
                      {b.bookingDate}
                    </Typography>
                  </View>

                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={14} color={colors.primary} />
                    <Typography variant="caption" weight="bold" style={{ marginLeft: 5, fontSize: 12 }}>
                      {b.timeSlot}
                    </Typography>
                  </View>

                  <View style={styles.detailItem}>
                    <Ionicons name="cash-outline" size={14} color={colors.primary} />
                    <Typography variant="caption" weight="bold" style={{ marginLeft: 5, fontSize: 12 }}>
                      {b.totalPrice > 0 ? `₹${b.totalPrice}` : 'Free'}
                    </Typography>
                  </View>
                </View>

                {/* Optional Notes */}
                {b.notes ? (
                  <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 8, fontStyle: 'italic' }}>
                    Note: "{b.notes}"
                  </Typography>
                ) : null}

                {/* Actions Row */}
                <View style={styles.cardActions}>
                  {b.providerPhone ? (
                    <AnimatedButton
                      onPress={() => handleCallProvider(b.providerPhone)}
                      style={[styles.smallBtn, { borderColor: colors.border }]}
                      hapticFeedback="light"
                    >
                      <Ionicons name="call-outline" size={13} color={colors.text} style={{ marginRight: 4 }} />
                      <Typography variant="caption" weight="bold">
                        Call Provider
                      </Typography>
                    </AnimatedButton>
                  ) : null}

                  {canCancel && (
                    <AnimatedButton
                      onPress={() => handleCancel(b)}
                      style={[styles.smallBtn, { borderColor: '#FF3B3044' }]}
                      hapticFeedback="light"
                    >
                      <Ionicons name="close-circle-outline" size={13} color="#FF3B30" style={{ marginRight: 4 }} />
                      <Typography variant="caption" weight="bold" style={{ color: '#FF3B30' }}>
                        Cancel
                      </Typography>
                    </AnimatedButton>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterBar: {
    flexDirection: 'row',
    padding: 6,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  bookingCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  detailsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
});
