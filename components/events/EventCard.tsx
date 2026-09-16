import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { CityEvent } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

interface EventCardProps {
  item: CityEvent;
  onPress?: () => void;
}

export function EventCard({ item, onPress }: EventCardProps) {
  const { colors, spacing } = useTheme();

  return (
    <AnimatedButton
      onPress={onPress}
      style={[
        styles.cardWrapper,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* Cover Photo */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.cardImage}
          contentFit="cover"
          transition={200}
        />
        {/* Category Badge Overlay */}
        <View style={styles.categoryBadgeOverlay}>
          <Badge
            label={item.category.toUpperCase()}
            variant="default"
          />
        </View>
        {/* Price Badge Overlay */}
        <View style={styles.priceBadgeOverlay}>
          <Badge
            label={item.price === 'Free' ? 'FREE' : item.price}
            variant={item.price === 'Free' ? 'primary' : 'warning'}
          />
        </View>
      </View>

      {/* Details */}
      <View style={[styles.cardContent, { padding: spacing.md }]}>
        {/* Date & Time */}
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={15} color={colors.primary} />
          <Typography
            variant="caption"
            weight="bold"
            color={colors.primary}
            style={{ marginLeft: 5 }}
          >
            {item.date} • {item.time}
          </Typography>
        </View>

        {/* Title */}
        <Typography variant="h3" numberOfLines={2} style={{ marginTop: 4 }}>
          {item.title}
        </Typography>

        {/* Venue / Location */}
        <View style={[styles.locationRow, { marginTop: 6 }]}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Typography
            variant="caption"
            color={colors.textMuted}
            numberOfLines={1}
            style={{ marginLeft: 4, flex: 1 }}
          >
            {item.locationName}
          </Typography>
        </View>

        {/* Civic Points bonus banner if applicable */}
        {item.civicPointsReward && item.civicPointsReward > 0 && (
          <View
            style={[
              styles.rewardStrip,
              { backgroundColor: colors.primaryMuted, marginTop: spacing.sm },
            ]}
          >
            <Ionicons name="sparkles" size={14} color={colors.primary} />
            <Typography
              variant="caption"
              weight="semiBold"
              color={colors.primary}
              style={{ marginLeft: 5 }}
            >
              +{item.civicPointsReward} Civic Points for joining
            </Typography>
          </View>
        )}

        {/* Footer / Event details link */}
        <View style={[styles.footerRow, { marginTop: spacing.sm }]}>
          {item.rating && item.rating > 0 ? (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Typography variant="caption" weight="bold" style={{ marginLeft: 3 }}>
                {item.rating.toFixed(1)}
              </Typography>
              <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 3 }}>
                ({item.reviewCount ?? 0})
              </Typography>
            </View>
          ) : (
            <Typography variant="caption" color={colors.textMuted}>
              Public Community Event
            </Typography>
          )}
          <Typography variant="caption" weight="bold" color={colors.primary}>
            View Details →
          </Typography>
        </View>
      </View>
    </AnimatedButton>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 155,
    width: '100%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  categoryBadgeOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  priceBadgeOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  cardContent: {},
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
