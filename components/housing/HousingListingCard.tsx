import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { BusinessDirectoryItem } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

interface HousingListingCardProps {
  item: BusinessDirectoryItem;
  isUnlocked: boolean;
  onPress: () => void;
  onUnlockPress?: () => void;
}

export function HousingListingCard({
  item,
  isUnlocked,
  onPress,
  onUnlockPress,
}: HousingListingCardProps) {
  const { colors, spacing } = useTheme();

  const isPG =
    item.subcategory === 'pg_boys' ||
    item.subcategory === 'pg_girls' ||
    item.subcategory === 'pg_coed';

  const subcategoryLabel = formatSubcategory(item.subcategory);
  const isVacatingSoon = item.vacancyStatus === 'vacating_soon';
  const isOccupied = item.vacancyStatus === 'occupied';

  return (
    <AnimatedButton
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {/* Cover Image & Price Header */}
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />

        {/* Rent Tag */}
        {item.monthlyRent ? (
          <View style={[styles.rentTag, { backgroundColor: colors.surface + 'F0' }]}>
            <Typography variant="body" weight="bold" color={colors.primary}>
              ₹{item.monthlyRent.toLocaleString('en-IN')}
            </Typography>
            <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>
              /mo
            </Typography>
          </View>
        ) : null}

        {/* Top Badges */}
        <View style={styles.topBadgesRow}>
          <Badge label={subcategoryLabel.toUpperCase()} variant="default" />
          {item.isZeroBrokerVerified !== false && (
            <View style={[styles.zeroBrokerBadge, { backgroundColor: '#10B981' }]}>
              <Ionicons name="shield-checkmark" size={11} color="#FFFFFF" />
              <Typography variant="caption" weight="bold" color="#FFFFFF" style={{ fontSize: 10, marginLeft: 3 }}>
                ZERO BROKER
              </Typography>
            </View>
          )}
        </View>

        {/* Vacancy Status Banner */}
        {isVacatingSoon && (
          <View style={styles.vacatingBanner}>
            <Ionicons name="time-outline" size={12} color="#FFFFFF" />
            <Typography variant="caption" weight="bold" color="#FFFFFF" style={{ fontSize: 11, marginLeft: 4 }}>
              Vacating: {item.availableFromDate || 'Soon'}
            </Typography>
          </View>
        )}
        {isOccupied && (
          <View style={[styles.vacatingBanner, { backgroundColor: '#EF4444' }]}>
            <Ionicons name="close-circle-outline" size={12} color="#FFFFFF" />
            <Typography variant="caption" weight="bold" color="#FFFFFF" style={{ fontSize: 11, marginLeft: 4 }}>
              Occupied
            </Typography>
          </View>
        )}
      </View>

      {/* Body Details */}
      <View style={[styles.content, { padding: spacing.md }]}>
        <Typography variant="h3" numberOfLines={1}>
          {item.name}
        </Typography>

        {/* Location Row */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Typography variant="caption" color={colors.textMuted} numberOfLines={1} style={{ marginLeft: 4, flex: 1 }}>
            {item.address}
          </Typography>
        </View>

        {/* Housing Specific Chips */}
        <View style={styles.amenitiesRow}>
          {item.bhkType && (
            <View style={[styles.amenityChip, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="home-outline" size={12} color={colors.primary} />
              <Typography variant="caption" color={colors.primary} weight="semiBold" style={styles.amenityText}>
                {item.bhkType.toUpperCase().replace(/_/g, ' ')}
              </Typography>
            </View>
          )}

          {item.sharingType && (
            <View style={[styles.amenityChip, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="people-outline" size={12} color={colors.primary} />
              <Typography variant="caption" color={colors.primary} weight="semiBold" style={styles.amenityText}>
                {item.sharingType.charAt(0).toUpperCase() + item.sharingType.slice(1)} Sharing
              </Typography>
            </View>
          )}

          {item.furnishingStatus && (
            <View style={[styles.amenityChip, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}>
              <Typography variant="caption" color={colors.textMuted} style={styles.amenityText}>
                {item.furnishingStatus === 'semi_furnished' ? 'Semi-Furnished' : item.furnishingStatus === 'fully_furnished' ? 'Furnished' : 'Unfurnished'}
              </Typography>
            </View>
          )}

          {item.foodIncluded && (
            <View style={[styles.amenityChip, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="restaurant-outline" size={12} color={colors.primary} />
              <Typography variant="caption" color={colors.primary} weight="semiBold" style={styles.amenityText}>
                Food Included
              </Typography>
            </View>
          )}

          {item.curfewTime && (
            <View style={[styles.amenityChip, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
              <Typography variant="caption" color={colors.textMuted} style={styles.amenityText}>
                Curfew: {item.curfewTime}
              </Typography>
            </View>
          )}

          {item.securityDeposit ? (
            <View style={[styles.amenityChip, { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 }]}>
              <Typography variant="caption" color={colors.textMuted} style={styles.amenityText}>
                Deposit: ₹{item.securityDeposit.toLocaleString('en-IN')}
              </Typography>
            </View>
          ) : null}
        </View>

        {/* Vacating Tenant Note */}
        {item.vacatingTenantNote && (
          <View style={[styles.noteBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Typography variant="caption" color={colors.textMuted} numberOfLines={2} style={{ fontStyle: 'italic' }}>
              &ldquo;{item.vacatingTenantNote}&rdquo;
            </Typography>
          </View>
        )}

        {/* Bottom Action Strip */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {isUnlocked ? (
            <View style={styles.unlockedRow}>
              <View style={{ flex: 1 }}>
                <Typography variant="caption" color={colors.textMuted}>
                  Direct Landlord:
                </Typography>
                <Typography variant="body" weight="bold" color={colors.primary}>
                  {item.landlordName || 'House Owner'} ({item.phone || 'Available'})
                </Typography>
              </View>
              <View style={[styles.callBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="call" size={14} color="#FFFFFF" />
                <Typography variant="caption" weight="bold" color="#FFFFFF" style={{ marginLeft: 4 }}>
                  Call
                </Typography>
              </View>
            </View>
          ) : (
            <AnimatedButton
              onPress={onUnlockPress || onPress}
              style={[styles.lockedTeaserBtn, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
            >
              <Ionicons name="lock-closed" size={14} color={colors.primary} />
              <Typography variant="caption" weight="bold" color={colors.primary} style={{ marginLeft: 6 }}>
                Unlock Direct Landlord Contact & Address
              </Typography>
            </AnimatedButton>
          )}
        </View>
      </View>
    </AnimatedButton>
  );
}

function formatSubcategory(sub?: string): string {
  switch (sub) {
    case 'bhk':
      return 'BHK Flat';
    case 'pg':
      return 'PG';
    case 'hostel':
      return 'Hostel';
    case 'rk':
      return '1 RK';
    case 'room':
      return 'Room Rental';
    case 'pg_boys':
      return 'Boys PG';
    case 'pg_girls':
      return 'Girls PG';
    case 'pg_coed':
      return 'Co-ed PG';
    case 'flats_apartments':
      return 'Rental Flat';
    case 'room_rental':
      return 'Room Rental';
    default:
      return 'To-Let';
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  imageWrap: {
    width: '100%',
    height: 160,
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  rentTag: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  topBadgesRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  zeroBrokerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vacatingBanner: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  content: {
    gap: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  amenityText: {
    fontSize: 11,
    marginLeft: 4,
  },
  noteBox: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 4,
  },
  unlockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  lockedTeaserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
});
