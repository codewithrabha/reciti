import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LegendList } from '@legendapp/list/react-native';

import { BusinessDirectoryItem, DirectoryCategory } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { DirectoryHorizontalCard } from './DirectoryHorizontalCard';

export interface CategoryShelfData {
  key: DirectoryCategory;
  label: string;
  icon: string;
  items: BusinessDirectoryItem[];
}

interface CategoryShelfProps {
  shelf: CategoryShelfData;
  onSeeAll: (categoryKey: DirectoryCategory) => void;
  onCardPress: (item: BusinessDirectoryItem) => void;
}

export function CategoryShelf({ shelf, onSeeAll, onCardPress }: CategoryShelfProps) {
  const { colors, spacing } = useTheme();

  if (shelf.items.length === 0) return null;

  return (
    <View style={styles.shelfContainer}>
      {/* Header */}
      <View style={[styles.headerRow, { paddingHorizontal: 16 }]}>
        <View style={styles.titleGroup}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name={shelf.icon as any} size={17} color={colors.primary} />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Typography variant="h3" style={{ fontSize: 17, fontWeight: '700' }}>
              {shelf.label}
            </Typography>
            <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 1 }}>
              {shelf.items.length} {shelf.items.length === 1 ? 'place' : 'places'} nearby
            </Typography>
          </View>
        </View>

        <AnimatedButton
          onPress={() => onSeeAll(shelf.key)}
          style={[styles.seeAllButton, { backgroundColor: colors.surface }]}
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
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  horizontalList: {
    paddingHorizontal: 16,
    gap: 12,
  },
});
