import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { ServiceItem } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { BookmarkButton } from '@/components/ui/BookmarkButton';

interface ServiceCardProps {
  item: ServiceItem;
  onPress?: (item: ServiceItem) => void;
  onBookPress?: (item: ServiceItem) => void;
  variant?: 'shelf' | 'list' | 'grid';
}

export function ServiceCard({
  item,
  onPress,
  onBookPress,
  variant = 'shelf',
}: ServiceCardProps) {
  const { colors } = useTheme();

  const formattedPrice = item.price > 0 ? `₹${item.price.toLocaleString('en-IN')}` : 'Free';
  const pricePrefix = item.priceType === 'starting_at' ? 'Starts at ' : '';

  const isList = variant === 'list';
  const isGrid = variant === 'grid';

  return (
    <Pressable
      onPress={() => onPress?.(item)}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.cardContainer,
        isList && styles.cardContainerList,
        variant === 'shelf' && styles.cardContainerShelf,
        isGrid && styles.cardContainerGrid,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed && onPress ? 0.94 : 1,
        },
      ]}
    >
      {/* Top Banner / Image Area */}
      <View
        style={[
          styles.imageContainer,
          isList && styles.imageContainerList,
          variant === 'shelf' && styles.imageContainerShelf,
          isGrid && styles.imageContainerGrid,
          { backgroundColor: colors.background },
        ]}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.cardImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.placeholderBanner}>
            <Ionicons
              name="sparkles-outline"
              size={isList ? 36 : isGrid ? 28 : 28}
              color={colors.primary}
            />
          </View>
        )}

        {/* Top Badges & Actions (Hidden in Grid variant for a clean image-only preview) */}
        {!isGrid && (
          <View style={styles.badgeRow}>
            <View style={styles.badgeLeftGroup}>
              {item.badgeText ? (
                <Badge label={item.badgeText.toUpperCase()} variant="warning" />
              ) : (
                <Badge label="SERVICE" variant="default" />
              )}

              {item.durationMinutes ? (
                <View style={[styles.durationPill, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
                  <Ionicons name="time-outline" size={11} color="#fff" />
                  <Typography
                    variant="caption"
                    style={{ color: '#fff', fontSize: 10, marginLeft: 3, fontWeight: '600' }}
                  >
                    {item.durationMinutes}m
                  </Typography>
                </View>
              ) : null}
            </View>

            {/* Bookmark Button */}
            <BookmarkButton
              variant="badge"
              item={{
                targetId: item.id,
                itemType: 'service',
                title: item.title,
                imageUrl: item.imageUrl,
                city: item.city || undefined,
                extraMeta: {
                  priceTag: formattedPrice,
                },
              }}
            />
          </View>
        )}
      </View>

      {/* Card Content */}
      {isGrid ? (
        /* Grid Variant: Image and Name only */
        <View style={styles.contentBodyGrid}>
          <Typography
            variant="body"
            numberOfLines={2}
            style={{
              fontSize: 11.5,
              fontWeight: '700',
              lineHeight: 15,
              color: colors.text,
            }}
          >
            {item.title}
          </Typography>
        </View>
      ) : (
        /* Shelf / List Variant: Full details with price and book button */
        <View style={[styles.contentBody, isList && styles.contentBodyList]}>
          {/* Title */}
          <Typography
            variant="h3"
            numberOfLines={isList ? 2 : 1}
            style={{
              fontSize: isList ? 16 : 15,
              fontWeight: '700',
              lineHeight: 22,
            }}
          >
            {item.title}
          </Typography>

          {/* Provider Name */}
          <View style={styles.providerRow}>
            <Ionicons name="person-circle-outline" size={15} color={colors.textMuted} />
            <Typography
              variant="caption"
              color={colors.textMuted}
              numberOfLines={1}
              style={{ marginLeft: 5, flex: 1, fontSize: 12 }}
            >
              {item.providerName}
            </Typography>
          </View>

          {/* Description Snippet for List view */}
          {isList && item.description ? (
            <Typography
              variant="caption"
              color={colors.textMuted}
              numberOfLines={2}
              style={{ fontSize: 12, lineHeight: 18, marginBottom: 8 }}
            >
              {item.description}
            </Typography>
          ) : null}

          {/* Price & Action Row */}
          <View style={styles.footerRow}>
            <View>
              <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 10 }}>
                {pricePrefix ? 'STARTING FROM' : 'PRICE'}
              </Typography>
              <Typography
                variant="h3"
                style={{
                  fontSize: 16,
                  fontWeight: '800',
                  color: colors.primary,
                }}
              >
                {formattedPrice}
              </Typography>
            </View>

            {onBookPress ? (
              <AnimatedButton
                onPress={() => onBookPress(item)}
                style={[styles.bookButton, { backgroundColor: colors.primary }]}
                hapticFeedback="medium"
              >
                <Ionicons
                  name="calendar-outline"
                  size={13}
                  color="#fff"
                  style={{ marginRight: 4 }}
                />
                <Typography variant="caption" weight="bold" style={{ color: '#fff', fontSize: 12 }}>
                  Book
                </Typography>
              </AnimatedButton>
            ) : null}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardContainerShelf: {
    width: 230,
    marginRight: 12,
  },
  cardContainerList: {
    width: '100%',
    marginBottom: 14,
  },
  cardContainerGrid: {
    width: '100%',
    borderRadius: 12,
  },
  imageContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  imageContainerShelf: {
    height: 110,
  },
  imageContainerList: {
    height: 150,
  },
  imageContainerGrid: {
    height: 80,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBanner: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  badgeRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  contentBody: {
    padding: 12,
  },
  contentBodyList: {
    padding: 14,
  },
  contentBodyGrid: {
    paddingHorizontal: 7,
    paddingVertical: 7,
    minHeight: 42,
    justifyContent: 'center',
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
});
