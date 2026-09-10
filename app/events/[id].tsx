import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { CityEvent } from '@/types';
import { getEventById } from '@/lib/eventService';
import { shareEvent } from '@/lib/shareService';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { StateView } from '@/components/ui/StateView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 260;

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radii } = useTheme();

  const [event, setEvent] = useState<CityEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const item = await getEventById(id);
        setEvent(item);
      } catch (err) {
        console.error('[EventDetail] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleShare = async () => {
    if (!event) return;
    await shareEvent(event);
  };

  const handleDirections = () => {
    if (!event) return;
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${event.latitude},${event.longitude}`;
    const label = encodeURIComponent(event.locationName);
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latLng}`,
    });
    if (url) Linking.openURL(url);
  };

  const handleCallOrganizer = () => {
    if (!event?.contactPhone) return;
    Linking.openURL(`tel:${event.contactPhone}`);
  };

  const handleEmailOrganizer = () => {
    if (!event?.contactEmail) return;
    Linking.openURL(`mailto:${event.contactEmail}`);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <StateView
          icon="calendar"
          tone="error"
          title="Event Not Found"
          message="This city event could not be found or has concluded."
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sticky Top Header */}
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 8 },
          scrolled && {
            backgroundColor: colors.background,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          },
        ]}
      >
        <AnimatedButton
          onPress={() => router.back()}
          hapticFeedback="light"
          style={[styles.circleButton, { backgroundColor: scrolled ? colors.surface : colors.surface + 'EE' }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </AnimatedButton>
        <View style={styles.topBarRight}>
          <AnimatedButton
            onPress={handleShare}
            hapticFeedback="light"
            style={[styles.circleButton, { backgroundColor: scrolled ? colors.surface : colors.surface + 'EE' }]}
          >
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </AnimatedButton>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          if (y > 24 !== scrolled) setScrolled(y > 24);
        }}
      >
        {/* Banner Image */}
        <View style={styles.bannerContainer}>
          <Image
            source={{ uri: event.imageUrl }}
            style={styles.bannerImage}
            contentFit="cover"
            transition={300}
          />
        </View>

        {/* Content Body */}
        <Animated.View entering={FadeIn.duration(250)} style={[styles.body, { paddingHorizontal: spacing.md }]}>
          {/* Category & Tag Row */}
          <View style={styles.metaRow}>
            <Badge
              label={event.category.toUpperCase()}
              variant="default"
            />
            <Badge
              label={event.price === 'Free' ? 'FREE ENTRY' : event.price}
              variant={event.price === 'Free' ? 'primary' : 'warning'}
            />
            {event.isVerifiedOrganizer && (
              <Badge
                label="VERIFIED ORGANIZER"
                variant="primary"
              />
            )}
            {event.isSponsored && (
              <Badge
                label="PARTNER EVENT"
                variant="default"
              />
            )}
          </View>

          {/* Event Title */}
          <Typography variant="h1" style={{ marginTop: spacing.sm }}>
            {event.title}
          </Typography>

          {/* Organizer */}
          <View style={styles.organizerRow}>
            <Ionicons name="people-circle-outline" size={18} color={colors.primary} />
            <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 6 }}>
              Organized by{' '}
              <Typography variant="caption" weight="bold" color={colors.text}>
                {event.organizerName}
              </Typography>
              {event.organizerType && ` • ${event.organizerType.toUpperCase()}`}
            </Typography>
          </View>

          {/* Date & Time Block */}
          <View style={[styles.infoBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <View style={[styles.iconPill, { backgroundColor: colors.primaryMuted }]}>
                <Ionicons name="calendar" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Typography variant="body" weight="bold">
                  {event.date}
                </Typography>
                <Typography variant="caption" color={colors.textMuted}>
                  {event.time}
                </Typography>
              </View>
            </View>

            <View style={[styles.infoRow, { marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={[styles.iconPill, { backgroundColor: colors.border }]}>
                <Ionicons name="location" size={18} color={colors.text} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Typography variant="body" weight="bold">
                  {event.locationName}
                </Typography>
                <Typography variant="caption" color={colors.textMuted}>
                  {event.address}{event.city ? `, ${event.city}` : ''}
                </Typography>
              </View>
              <AnimatedButton
                onPress={handleDirections}
                style={[styles.mapBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              >
                <Ionicons name="navigate-outline" size={14} color={colors.primary} />
                <Typography variant="caption" weight="bold" color={colors.primary} style={{ marginLeft: 4 }}>
                  Map
                </Typography>
              </AnimatedButton>
            </View>
          </View>

          {/* Organizer Contact Action Strip (if available) */}
          {(event.contactPhone || event.contactEmail) && (
            <View style={styles.contactRow}>
              {event.contactPhone && (
                <AnimatedButton
                  onPress={handleCallOrganizer}
                  style={[styles.contactBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Ionicons name="call-outline" size={16} color={colors.primary} />
                  <Typography variant="caption" weight="semiBold" style={{ marginLeft: 6 }}>
                    Contact Organizer
                  </Typography>
                </AnimatedButton>
              )}
              {event.contactEmail && (
                <AnimatedButton
                  onPress={handleEmailOrganizer}
                  style={[styles.contactBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Ionicons name="mail-outline" size={16} color={colors.primary} />
                  <Typography variant="caption" weight="semiBold" style={{ marginLeft: 6 }}>
                    Email Info
                  </Typography>
                </AnimatedButton>
              )}
            </View>
          )}

          {/* Civic Points Bonus (if civic cleanup or community drive) */}
          {event.civicPointsReward && event.civicPointsReward > 0 && (
            <Card
              padding="md"
              style={[
                styles.civicCard,
                { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
              ]}
            >
              <View style={styles.civicRow}>
                <Ionicons name="sparkles" size={20} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Typography variant="caption" weight="bold" color={colors.primary}>
                    CIVIC IMPACT REWARD
                  </Typography>
                  <Typography variant="body" weight="semiBold" color={colors.text}>
                    Earn +{event.civicPointsReward} Civic Karma points by participating
                  </Typography>
                </View>
              </View>
            </Card>
          )}

          {/* Description Section */}
          <Typography variant="h2" style={{ marginTop: spacing.lg, marginBottom: spacing.xs }}>
            Event Details
          </Typography>
          <Typography variant="body" color={colors.text} style={{ lineHeight: 22 }}>
            {event.description}
          </Typography>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bannerContainer: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  topBarRight: { flexDirection: 'row', gap: 10 },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  body: {
    paddingTop: 16,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  infoBlock: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  civicCard: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  civicRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
