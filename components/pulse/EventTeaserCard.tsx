import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { CityEvent } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

interface EventTeaserCardProps {
  event: CityEvent;
  onPress: () => void;
}

export function EventTeaserCard({ event, onPress }: EventTeaserCardProps) {
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
          source={{ uri: event.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        {/* Category Badge */}
        <View style={styles.categoryBadge}>
          <Badge
            label={event.category.toUpperCase()}
            variant="default"
          />
        </View>
        {/* Price Badge */}
        <View style={styles.priceBadge}>
          <Badge
            label={event.price === 'Free' ? 'FREE' : event.price}
            variant={event.price === 'Free' ? 'primary' : 'warning'}
          />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={12} color={colors.primary} />
          <Typography
            variant="caption"
            weight="bold"
            color={colors.primary}
            style={{ marginLeft: 3 }}
          >
            {event.date}
          </Typography>
        </View>

        <Typography
          variant="body"
          weight="semiBold"
          numberOfLines={1}
          style={{ marginTop: 2, height: 38 }}
        >
          {event.title}
        </Typography>

        <View style={styles.footerRow}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <Typography
            variant="caption"
            color={colors.textMuted}
            numberOfLines={1}
            style={{ marginLeft: 3, flex: 1 }}
          >
            {event.locationName}
          </Typography>
        </View>
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
  priceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
});
