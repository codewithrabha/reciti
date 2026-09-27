import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LegendList } from '@legendapp/list/react-native';

import { BusinessDirectoryItem } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { DirectoryHorizontalCard } from './DirectoryHorizontalCard';

export interface SubcategoryShelfData {
  key: string;
  label: string;
  icon: string;
  items: BusinessDirectoryItem[];
}

interface SubcategoryShelfProps {
  shelf: SubcategoryShelfData;
  onSeeAll: (subcategoryKey: string) => void;
  onCardPress: (item: BusinessDirectoryItem) => void;
}

export function SubcategoryShelf({ shelf, onSeeAll, onCardPress }: SubcategoryShelfProps) {
  const { colors } = useTheme();

  if (shelf.items.length === 0) return null;

  return (
    <View style={styles.shelfContainer}>
      {/* Shelf Header */}
      <View style={[styles.headerRow, { paddingHorizontal: 16 }]}>
        <View style={styles.titleGroup}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name={(shelf.icon || 'apps-outline') as any} size={16} color={colors.primary} />
          </View>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Typography variant="h3" style={{ fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
              {shelf.label}
            </Typography>
            <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 1 }}>
              {shelf.items.length} {shelf.items.length === 1 ? 'place' : 'places'} nearby
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

      {/* Horizontal List Carousel */}
      <LegendList
        horizontal
        data={shelf.items}
        keyExtractor={(item) => item.id}
        estimatedItemSize={250}
        recycleItems
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        renderItem={({ item }) => (
          <DirectoryHorizontalCard
            item={item}
            onPress={() => onCardPress(item)}
            width={250}
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
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  horizontalList: {
    paddingHorizontal: 16,
    gap: 12,
  },
});
