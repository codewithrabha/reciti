import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { BusinessDirectoryItem } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

interface BusinessTeaserCardProps {
  business: BusinessDirectoryItem;
  onPress: () => void;
}

export function BusinessTeaserCard({ business, onPress }: BusinessTeaserCardProps) {
  const { colors, spacing } = useTheme();

  return (
    <AnimatedButton
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* Cover Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: business.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        {/* Category Badge */}
        <View style={styles.categoryBadge}>
          <Badge
            label={business.category.replace('_', ' ').toUpperCase()}
            variant="default"
          />
        </View>
        {/* Rating Badge */}
        {business.rating && (
          <View style={[styles.ratingBadge, { backgroundColor: colors.surface + 'EE' }]}>
            <Ionicons name="star" size={11} color="#F59E0B" />
            <Typography variant="caption" weight="bold" style={{ marginLeft: 2, fontSize: 11 }}>
              {business.rating.toFixed(1)}
            </Typography>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={[styles.content, { padding: spacing.sm }]}>
        <Typography
          variant="body"
          weight="semiBold"
          numberOfLines={1}
          style={{ height: 20 }}
        >
          {business.name}
        </Typography>

        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <Typography
            variant="caption"
            color={colors.textMuted}
            numberOfLines={1}
            style={{ marginLeft: 3, flex: 1 }}
          >
            {business.address}
          </Typography>
        </View>

        {business.openingHours && (
          <View style={[styles.addressRow, { marginTop: 4 }]}>
            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
            <Typography
              variant="caption"
              color={colors.textMuted}
              numberOfLines={1}
              style={{ marginLeft: 3, flex: 1, fontSize: 11 }}
            >
              {business.openingHours}
            </Typography>
          </View>
        )}
      </View>
    </AnimatedButton>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 240,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: 12,
  },
  imageContainer: {
    width: '100%',
    height: 125,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  content: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
});
