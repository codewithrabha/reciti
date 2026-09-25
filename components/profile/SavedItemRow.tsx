import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { UserBookmark } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { Badge } from '@/components/ui/Badge';

interface SavedItemRowProps {
  bookmark: UserBookmark;
  isFirst: boolean;
  isLast: boolean;
}

export const SavedItemRow = React.memo(function SavedItemRow({
  bookmark,
  isFirst,
  isLast,
}: SavedItemRowProps) {
  const router = useRouter();
  const { colors, radii } = useTheme();

  const handlePress = () => {
    if (bookmark.itemType === 'event') {
      router.push({ pathname: '/events/[id]', params: { id: bookmark.targetId } });
    } else {
      router.push({ pathname: '/directories/[id]', params: { id: bookmark.targetId } });
    }
  };

  const getTypeBadge = () => {
    switch (bookmark.itemType) {
      case 'housing':
        return <Badge label="RENTAL" variant="warning" />;
      case 'event':
        return <Badge label="EVENT" variant="primary" />;
      default:
        return <Badge label="PLACE" variant="default" />;
    }
  };

  const getSubtext = () => {
    if (bookmark.itemType === 'housing' && bookmark.extraMeta?.monthlyRent) {
      return `₹${bookmark.extraMeta.monthlyRent.toLocaleString('en-IN')}/mo${
        bookmark.extraMeta.bhkType ? ` · ${bookmark.extraMeta.bhkType.toUpperCase().replace(/_/g, ' ')}` : ''
      }${bookmark.address ? ` · ${bookmark.address.split(',')[0]}` : ''}`;
    }

    if (bookmark.itemType === 'event' && bookmark.extraMeta?.eventDate) {
      return `${bookmark.extraMeta.eventDate}${
        bookmark.extraMeta.venueName ? ` · ${bookmark.extraMeta.venueName}` : ''
      }`;
    }

    return `${bookmark.category ? bookmark.category.toUpperCase() : ''}${
      bookmark.address ? ` · ${bookmark.address.split(',')[0]}` : ''
    }`;
  };

  return (
    <AnimatedButton
      onPress={handlePress}
      hapticFeedback="light"
      scaleTo={0.99}
      style={[
        styles.row,
        { backgroundColor: colors.surface },
        isFirst && { borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
        isLast && { borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg },
        !isFirst && { borderTopColor: colors.border, borderTopWidth: 1 },
      ]}
    >
      {/* Thumbnail */}
      {bookmark.imageUrl ? (
        <Image
          source={{ uri: bookmark.imageUrl }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={[styles.fallbackIcon, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons
            name={
              bookmark.itemType === 'event'
                ? 'calendar'
                : bookmark.itemType === 'housing'
                ? 'home'
                : 'business'
            }
            size={20}
            color={colors.primary}
          />
        </View>
      )}

      {/* Info details */}
      <View style={styles.info}>
        <View style={styles.headerRow}>
          <Typography variant="body" weight="semiBold" numberOfLines={1} style={{ flex: 1 }}>
            {bookmark.title}
          </Typography>
          {getTypeBadge()}
        </View>
        <Typography variant="caption" color={colors.textMuted} numberOfLines={1} style={{ marginTop: 2 }}>
          {getSubtext()}
        </Typography>
      </View>

      {/* Quick Unsave Action */}
      <BookmarkButton
        variant="plain"
        size={20}
        item={{
          targetId: bookmark.targetId,
          itemType: bookmark.itemType,
          title: bookmark.title,
          category: bookmark.category,
          imageUrl: bookmark.imageUrl,
          address: bookmark.address,
          city: bookmark.city,
        }}
      />
    </AnimatedButton>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  fallbackIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
