import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ServiceItem } from '@/types';
import { getServiceById } from '@/lib/serviceBookingService';
import { shareService } from '@/lib/shareService';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { StateView } from '@/components/ui/StateView';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { ServiceBookingModal } from '@/components/services/ServiceBookingModal';
import { getServiceCategoryMeta } from '@/lib/serviceTaxonomyService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 240;

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radii } = useTheme();

  const [service, setService] = useState<ServiceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const item = await getServiceById(id);
        setService(item);
      } catch (err) {
        console.error('[ServiceDetail] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleShare = async () => {
    if (!service) return;
    await shareService(service);
  };

  const handleCallProvider = () => {
    if (!service?.providerPhone) return;
    Linking.openURL(`tel:${service.providerPhone}`);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <StateView
          icon="alert-circle-outline"
          tone="error"
          title="Service Not Found"
          message="This service listing could not be found or is currently inactive."
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const formattedPrice = service.price > 0 ? `₹${service.price.toLocaleString('en-IN')}` : 'Free';
  const pricePrefix = service.priceType === 'starting_at' ? 'Starts at ' : '';

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
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 3,
          },
        ]}
      >
        <AnimatedButton
          onPress={() => router.back()}
          hapticFeedback="light"
          style={[
            styles.circleButton,
            { backgroundColor: scrolled ? colors.surface : colors.surface + 'EE' },
          ]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </AnimatedButton>

        {scrolled && (
          <Typography
            variant="h3"
            numberOfLines={1}
            style={[styles.scrolledTitle, { color: colors.text }]}
          >
            {service.title}
          </Typography>
        )}

        <View style={styles.topBarRight}>
          <BookmarkButton
            variant="header"
            item={{
              targetId: service.id,
              itemType: 'service',
              title: service.title,
              imageUrl: service.imageUrl,
              city: service.city || undefined,
              extraMeta: {
                priceTag: formattedPrice,
              },
            }}
          />
          <AnimatedButton
            onPress={handleShare}
            hapticFeedback="light"
            style={[
              styles.circleButton,
              { backgroundColor: scrolled ? colors.surface : colors.surface + 'EE' },
            ]}
          >
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </AnimatedButton>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        scrollEventThrottle={16}
        overScrollMode="never"
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          if (y > 30 !== scrolled) setScrolled(y > 30);
        }}
      >
        {/* Banner Cover */}
        <View style={[styles.bannerContainer, { backgroundColor: colors.surface }]}>
          {service.imageUrl ? (
            <Image
              source={{ uri: service.imageUrl }}
              style={styles.bannerImage}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={styles.placeholderBanner}>
              <Ionicons name="sparkles-outline" size={48} color={colors.primary} />
            </View>
          )}

          {/* Floating Pill on banner */}
          <View style={styles.bannerBadgeRow}>
            {service.badgeText ? (
              <Badge label={service.badgeText.toUpperCase()} variant="warning" />
            ) : (
              <Badge label="VERIFIED SERVICE" variant="default" />
            )}

            {service.durationMinutes ? (
              <View style={[styles.durationPill, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
                <Ionicons name="time-outline" size={13} color="#fff" />
                <Typography
                  variant="caption"
                  style={{ color: '#fff', fontSize: 11, marginLeft: 4, fontWeight: '700' }}
                >
                  {service.durationMinutes} mins
                </Typography>
              </View>
            ) : null}
          </View>
        </View>

        {/* Content Body */}
        <Animated.View
          entering={FadeIn.duration(250)}
          style={[styles.body, { paddingHorizontal: spacing.md }]}
        >
          {/* Dedicated Category & City Badge */}
          <View style={styles.categoryRow}>
            {service.categoryId ? (
              <Badge
                label={(
                  getServiceCategoryMeta(service.categoryId)?.label ||
                  service.categoryId.replace(/_/g, ' ')
                ).toUpperCase()}
                variant="primary"
              />
            ) : (
              (service.linkedCategoryIds || []).map((catId) => (
                <Badge
                  key={catId}
                  label={catId.replace(/_/g, ' ').toUpperCase()}
                  variant="primary"
                />
              ))
            )}

            {service.subcategoryId ? (
              <Badge
                label={service.subcategoryId.replace(/_/g, ' ').toUpperCase()}
                variant="default"
              />
            ) : null}

            {service.city ? (
              <View style={[styles.cityBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="location-sharp" size={12} color={colors.primary} />
                <Typography
                  variant="caption"
                  style={{ color: colors.text, fontSize: 11, marginLeft: 3, fontWeight: '600' }}
                >
                  {service.city}
                </Typography>
              </View>
            ) : null}
          </View>

          {/* Service Title */}
          <Typography
            variant="h1"
            style={{ fontSize: 24, fontWeight: '800', lineHeight: 32, marginTop: 10 }}
          >
            {service.title}
          </Typography>

          {/* Provider Card */}
          <Card style={[styles.providerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.providerCardHeader}>
              <View style={[styles.providerAvatar, { backgroundColor: colors.primary + '18' }]}>
                {service.providerAvatar ? (
                  <Image source={{ uri: service.providerAvatar }} style={styles.providerAvatarImg} />
                ) : (
                  <Ionicons name="person" size={24} color={colors.primary} />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>
                  SERVICE PROVIDER
                </Typography>
                <Typography variant="h3" style={{ fontSize: 16, fontWeight: '700' }}>
                  {service.providerName}
                </Typography>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 }}>
                  <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
                  <Typography variant="caption" style={{ color: colors.primary, fontSize: 11, fontWeight: '600' }}>
                    Verified Partner
                  </Typography>
                </View>
              </View>
            </View>

            {/* Provider Actions */}
            <View style={styles.providerActionsRow}>
              {service.providerPhone ? (
                <AnimatedButton
                  onPress={handleCallProvider}
                  style={[styles.providerActionButton, { backgroundColor: colors.primary + '15' }]}
                  hapticFeedback="light"
                >
                  <Ionicons name="call-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                  <Typography variant="caption" weight="bold" style={{ color: colors.primary }}>
                    Call Provider
                  </Typography>
                </AnimatedButton>
              ) : null}

              {service.directoryId ? (
                <AnimatedButton
                  onPress={() =>
                    router.push({
                      pathname: '/directories/[id]',
                      params: { id: service.directoryId },
                    } as any)
                  }
                  style={[styles.providerActionButton, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
                  hapticFeedback="light"
                >
                  <Ionicons name="business-outline" size={15} color={colors.text} style={{ marginRight: 6 }} />
                  <Typography variant="caption" weight="bold" style={{ color: colors.text }}>
                    View Business
                  </Typography>
                </AnimatedButton>
              ) : null}
            </View>
          </Card>

          {/* Description */}
          {service.description ? (
            <View style={styles.sectionContainer}>
              <Typography variant="h3" style={styles.sectionTitle}>
                About this Service
              </Typography>
              <Typography
                variant="body"
                color={colors.textMuted}
                style={{ fontSize: 14, lineHeight: 22 }}
              >
                {service.description}
              </Typography>
            </View>
          ) : null}

          {/* Available Timings & Schedule */}
          <View style={styles.sectionContainer}>
            <Typography variant="h3" style={styles.sectionTitle}>
              Availability & Time Slots
            </Typography>

            <View style={[styles.infoRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Typography variant="caption" color={colors.textMuted}>
                  Operational Days
                </Typography>
                <Typography variant="body" weight="medium" style={{ fontSize: 13, marginTop: 1 }}>
                  {service.availableDays && service.availableDays.length > 0
                    ? service.availableDays.join(', ')
                    : 'Monday to Sunday (All days)'}
                </Typography>
              </View>
            </View>

            {service.timeSlots && service.timeSlots.length > 0 ? (
              <View style={{ marginTop: 12 }}>
                <Typography variant="caption" color={colors.textMuted} style={{ marginBottom: 8 }}>
                  Typical appointment slots ({service.timeSlots.length} available daily):
                </Typography>
                <View style={styles.slotsGrid}>
                  {service.timeSlots.map((slot) => (
                    <View
                      key={slot}
                      style={[
                        styles.slotChip,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <Ionicons name="time-outline" size={12} color={colors.primary} />
                      <Typography
                        variant="caption"
                        style={{ marginLeft: 5, fontSize: 12, fontWeight: '600', color: colors.text }}
                      >
                        {slot}
                      </Typography>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          {/* ReCiti Assured Perks */}
          <View style={styles.sectionContainer}>
            <Typography variant="h3" style={styles.sectionTitle}>
              ReCiti Assurance
            </Typography>
            <View style={[styles.perksCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.perkItem}>
                <Ionicons name="flash-outline" size={18} color={colors.primary} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Typography variant="caption" weight="bold" style={{ color: colors.text }}>
                    Instant In-App Booking
                  </Typography>
                  <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>
                    Directly scheduled with provider, with real-time status tracking.
                  </Typography>
                </View>
              </View>

              <View style={[styles.perkDivider, { backgroundColor: colors.border }]} />

              <View style={styles.perkItem}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Typography variant="caption" weight="bold" style={{ color: colors.text }}>
                    Zero Advance Requirement
                  </Typography>
                  <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>
                    Pay directly to provider upon completion of the service.
                  </Typography>
                </View>
              </View>

              <View style={[styles.perkDivider, { backgroundColor: colors.border }]} />

              <View style={styles.perkItem}>
                <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Typography variant="caption" weight="bold" style={{ color: colors.text }}>
                    Hassle-Free Cancellation
                  </Typography>
                  <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>
                    Cancel anytime from your bookings screen with 1 tap.
                  </Typography>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={styles.priceContainer}>
          <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>
            {pricePrefix ? 'STARTING FROM' : 'SERVICE FEE'}
          </Typography>
          <Typography
            variant="h2"
            style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}
          >
            {formattedPrice}
          </Typography>
        </View>

        <AnimatedButton
          disabled={true}
          style={[
            styles.bookNowButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              opacity: 0.85,
            },
          ]}
          hapticFeedback="none"
        >
          <Ionicons name="time-outline" size={17} color={colors.textMuted} style={{ marginRight: 6 }} />
          <Typography variant="body" weight="bold" color={colors.textMuted} style={{ fontSize: 14 }}>
            Coming Soon
          </Typography>
        </AnimatedButton>
      </View>

      {/* Booking Modal */}
      <ServiceBookingModal
        visible={bookingModalVisible}
        service={service}
        categorySlug={service.categoryId || service.linkedCategoryIds?.[0]}
        onClose={() => setBookingModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  scrolledTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: '700',
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerContainer: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBanner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBadgeRow: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  body: {
    paddingTop: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  providerCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  providerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  providerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  providerActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  providerActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  sectionContainer: {
    marginTop: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  perksCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  perkDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  priceContainer: {
    marginRight: 16,
  },
  bookNowButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
});
