import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LegendList } from '@legendapp/list/react-native';

import { ServiceItem } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { ServiceCard } from './ServiceCard';

export interface ServiceCategoryShelfData {
  key: string;
  label: string;
  icon: string;
  imageUrl?: string | null;
  items: ServiceItem[];
}

interface ServiceCategoryShelfProps {
  shelf: ServiceCategoryShelfData;
  onSeeAll: (categoryKey: string) => void;
  onCardPress: (item: ServiceItem) => void;
  onBookPress?: (item: ServiceItem) => void;
}

export function ServiceCategoryShelf({
  shelf,
  onSeeAll,
  onCardPress,
  onBookPress,
}: ServiceCategoryShelfProps) {
  const { colors } = useTheme();

  if (shelf.items.length === 0) return null;

  return (
    <View style={styles.shelfContainer}>
      {/* Header */}
      <View style={[styles.headerRow, { paddingHorizontal: 16 }]}>
        <View style={styles.titleGroup}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons
                name={(shelf.icon || 'construct-outline') as any}
                size={17}
                color={colors.primary}
              />
            </View>

          <View style={{ marginLeft: 10, flex: 1 }}>
            <Typography variant="h3" style={{ fontSize: 17, fontWeight: '700' }} numberOfLines={1}>
              {shelf.label}
            </Typography>
            <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 1 }}>
              {shelf.items.length} {shelf.items.length === 1 ? 'service' : 'services'} available
            </Typography>
          </View>
        </View>

        <AnimatedButton
          onPress={() => onSeeAll(shelf.key)}
          style={styles.seeAllButton}
          hapticFeedback="light"
        >
          <Typography variant="caption" weight="bold" color={colors.primary}>
            See All
          </Typography>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} style={{ marginLeft: 2 }} />
        </AnimatedButton>
      </View>

      {/* Horizontal Carousel */}
      <LegendList
        horizontal
        data={shelf.items}
        keyExtractor={(item) => item.id}
        estimatedItemSize={242}
        recycleItems
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        renderItem={({ item }) => (
          <ServiceCard
            item={item}
            variant="shelf"
            onPress={() => onCardPress(item)}
            onBookPress={onBookPress ? () => onBookPress(item) : undefined}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shelfContainer: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageThumb: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
});
