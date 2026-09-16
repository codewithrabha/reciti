import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { BusinessDirectoryItem } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

interface DirectoryCardProps {
  item: BusinessDirectoryItem;
  onPress?: () => void;
}

export function DirectoryCard({ item, onPress }: DirectoryCardProps) {
  const { colors, spacing } = useTheme();

  return (
    <AnimatedButton
      onPress={onPress}
      style={[
        styles.cardWrapper,
        { backgroundColor: colors.surface, borderColor: colors.border },
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
          <Badge
            label={item.category.replace('_', ' ').toUpperCase()}
            variant="default"
          />
        </View>
        {item.isSponsored && (
          <View style={styles.sponsoredBadgeOverlay}>
            <Badge label="FEATURED" variant="warning" />
          </View>
        )}
      </View>

      {/* Content Details */}
      <View style={[styles.cardContent, { padding: spacing.md }]}>
        <View style={styles.titleRow}>
          <Typography variant="h3" numberOfLines={1} style={{ flex: 1 }}>
            {item.name}
          </Typography>
          {item.isVerified && (
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={colors.primary}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>

        {/* Address */}
        <View style={[styles.metaRow, { marginTop: 4 }]}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Typography
            variant="caption"
            color={colors.textMuted}
            numberOfLines={1}
            style={{ marginLeft: 4, flex: 1 }}
          >
            {item.address}
          </Typography>
        </View>

        {/* Rating and Hours */}
        <View style={[styles.statsRow, { marginTop: 6 }]}>
          {Boolean(item.rating && item.rating > 0 && item.reviewCount && item.reviewCount > 0) && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Typography variant="caption" weight="bold" style={{ marginLeft: 3 }}>
                {item.rating!.toFixed(1)}
              </Typography>
              <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 2 }}>
                ({item.reviewCount})
              </Typography>
            </View>
          )}
          {item.openingHours && (
            <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 'auto' }}>
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
    height: 150,
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
  sponsoredBadgeOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  cardContent: {},
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
