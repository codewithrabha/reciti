import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { BusinessDirectoryItem } from '@/types';
import { getCategoryLabel, getSubcategoryLabel } from '@/lib/directoryService';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

interface DirectoryHorizontalCardProps {
  item: BusinessDirectoryItem;
  onPress?: () => void;
  width?: number;
}

export function DirectoryHorizontalCard({
  item,
  onPress,
  width = 250,
}: DirectoryHorizontalCardProps) {
  const { colors, spacing } = useTheme();
  const categoryLabel = getCategoryLabel(item.category);
  const subcategoryLabel = getSubcategoryLabel(item.subcategory);
  const badgeLabel = (subcategoryLabel || categoryLabel).toUpperCase();

  return (
    <AnimatedButton
      onPress={onPress}
      style={[
        styles.cardWrapper,
        {
          width,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Top Cover Banner */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.cardImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.categoryBadgeOverlay}>
          <Badge label={badgeLabel} variant="default" />
        </View>
        {item.isSponsored && (
          <View style={styles.sponsoredBadgeOverlay}>
            <Badge label="FEATURED" variant="warning" />
          </View>
        )}
      </View>

      {/* Content Details */}
      <View style={[styles.cardContent, { padding: spacing.sm + 2 }]}>
        <View style={styles.titleRow}>
          <Typography variant="h3" numberOfLines={1} style={{ flex: 1, fontSize: 15 }}>
            {item.name}
          </Typography>
          {item.isVerified && (
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.primary}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>

        {/* Address */}
        <View style={[styles.metaRow, { marginTop: 4 }]}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <Typography
            variant="caption"
            color={colors.textMuted}
            numberOfLines={1}
            style={{ marginLeft: 3, flex: 1, fontSize: 12 }}
          >
            {item.address}
          </Typography>
        </View>

        {/* Rating and Hours */}
        <View style={[styles.statsRow, { marginTop: 6 }]}>
          {Boolean(item.rating && item.rating > 0 && item.reviewCount && item.reviewCount > 0) ? (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Typography variant="caption" weight="bold" style={{ marginLeft: 3, fontSize: 12 }}>
                {item.rating!.toFixed(1)}
              </Typography>
              <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 2, fontSize: 11 }}>
                ({item.reviewCount})
              </Typography>
            </View>
          ) : (
            <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>
              {subcategoryLabel || categoryLabel}
            </Typography>
          )}

          {item.openingHours && (
            <Typography
              variant="caption"
              color={colors.textMuted}
              numberOfLines={1}
              style={{ marginLeft: 'auto', fontSize: 11, maxWidth: 100 }}
            >
              {item.openingHours}
            </Typography>
          )}
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
    height: 130,
    width: '100%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  categoryBadgeOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  sponsoredBadgeOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  cardContent: {
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
