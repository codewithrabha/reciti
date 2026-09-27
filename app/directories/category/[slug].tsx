import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  RefreshControl,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LegendList } from '@legendapp/list/react-native';

import { BusinessDirectoryItem, DirectoryCategory, DirectorySubcategory } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { StateView } from '@/components/ui/StateView';
import { DirectoryCard } from '@/components/directories/DirectoryCard';
import { SubcategoryShelf, SubcategoryShelfData } from '@/components/directories/SubcategoryShelf';
import { useLocationStore } from '@/store/locationStore';
import {
  getCategoryMeta,
  getCategoryLabel,
  getSubcategoryLabel,
  getDirectoryItems,
  subscribeDynamicCategories,
  CategoryMeta,
} from '@/lib/directoryService';

export default function CategoryTaxonomyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const cityName = useLocationStore((s) => s.cityName);

  const { slug, subcategory: initialSubcat } = useLocalSearchParams<{
    slug: string;
    subcategory?: string;
  }>();

  const categorySlug = (slug || 'housing_rentals') as DirectoryCategory;

  const [categoryMeta, setCategoryMeta] = useState<CategoryMeta | undefined>(() =>
    getCategoryMeta(categorySlug)
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(
    initialSubcat || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<BusinessDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Subscribe to dynamic category metadata updates from Firestore
  useEffect(() => {
    setCategoryMeta(getCategoryMeta(categorySlug));
    const unsub = subscribeDynamicCategories(() => {
      setCategoryMeta(getCategoryMeta(categorySlug));
    });
    return () => unsub();
  }, [categorySlug]);

  const categoryLabel = categoryMeta?.label || getCategoryLabel(categorySlug);
  const categoryIcon = categoryMeta?.icon || 'grid-outline';

  // Load directory items belonging to this category
  const loadData = useCallback(async () => {
    try {
      const data = await getDirectoryItems(
        categorySlug,
        searchQuery,
        cityName ?? undefined,
        selectedSubcategory !== 'all' ? (selectedSubcategory as DirectorySubcategory) : undefined
      );
      setItems(data);
    } catch (err) {
      console.warn('[CategoryTaxonomyScreen] Error loading items:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categorySlug, searchQuery, cityName, selectedSubcategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleShare = async () => {
    try {
      const shareUrl = `https://reciti.in/directories/category/${categorySlug}`;
      await Share.share({
        title: `${categoryLabel} - ReCiti`,
        message: `Explore ${categoryLabel} spots in ${cityName || 'your city'} on ReCiti: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (err) {
      console.warn('[CategoryTaxonomyScreen] Share error:', err);
    }
  };

  // Determine whether to show Section Shelves or Focused Vertical List
  const isShelfMode = selectedSubcategory === 'all' && searchQuery.trim().length === 0;

  // Group listings by subcategories into LegendList shelves
  const subcategoryShelves = useMemo<SubcategoryShelfData[]>(() => {
    if (!isShelfMode) return [];

    const grouped: Record<string, BusinessDirectoryItem[]> = {};
    for (const item of items) {
      const subKey = item.subcategory || 'general';
      if (!grouped[subKey]) grouped[subKey] = [];
      grouped[subKey].push(item);
    }

    const shelves: SubcategoryShelfData[] = [];
    const addedKeys = new Set<string>();

    // 1. Add configured subcategories in order
    const subcats = categoryMeta?.subcategories || [];
    for (const sub of subcats) {
      const subItems = grouped[sub.key] || [];
      if (subItems.length > 0) {
        shelves.push({
          key: sub.key,
          label: sub.label,
          icon: sub.icon || 'apps-outline',
          items: subItems,
        });
        addedKeys.add(sub.key);
      }
    }

    // 2. Add any remaining items (uncategorized or custom subcategory)
    for (const [key, subItems] of Object.entries(grouped)) {
      if (!addedKeys.has(key) && subItems.length > 0) {
        shelves.push({
          key,
          label: getSubcategoryLabel(key) || 'Other Places',
          icon: 'grid-outline',
          items: subItems,
        });
      }
    }

    return shelves;
  }, [isShelfMode, items, categoryMeta]);

  // Header Component with Hero Banner, Search, and Status
  const listHeader = (
    <View style={styles.headerWrapper}>
      {/* Top Nav Action Bar */}
      <View style={styles.topBar}>
        <AnimatedButton
          onPress={() => router.back()}
          style={[styles.circleButton, { backgroundColor: colors.surface }]}
          hapticFeedback="light"
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </AnimatedButton>

        <View style={styles.topBarRight}>
          <AnimatedButton
            onPress={handleShare}
            style={[styles.circleButton, { backgroundColor: colors.surface }]}
            hapticFeedback="light"
          >
            <Ionicons name="share-social-outline" size={18} color={colors.text} />
          </AnimatedButton>
        </View>
      </View>

      {/* Hero Category Banner */}
      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.heroTopRow}>
          <View style={[styles.heroIconCircle, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name={categoryIcon as any} size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Typography variant="h2" style={{ fontSize: 20, fontWeight: '800' }}>
                {categoryLabel}
              </Typography>
              {categoryMeta?.badgeText && (
                <View style={[styles.heroBadge, { backgroundColor: colors.primary + '22', borderColor: colors.primary + '44' }]}>
                  <Typography variant="caption" weight="bold" color={colors.primary} style={{ fontSize: 10 }}>
                    {categoryMeta.badgeText.toUpperCase()}
                  </Typography>
                </View>
              )}
            </View>
            <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
              {items.length} {items.length === 1 ? 'spot' : 'spots'} {cityName ? `in ${cityName}` : 'available'}
            </Typography>
          </View>
        </View>

        {categoryMeta?.description ? (
          <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 10, lineHeight: 18 }}>
            {categoryMeta.description}
          </Typography>
        ) : null}
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={`Search within ${categoryLabel}...`}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <AnimatedButton onPress={() => setSearchQuery('')} hapticFeedback="light">
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </AnimatedButton>
          )}
        </View>
      </View>

      {/* Active Filter Bar (when a specific subcategory is selected) */}
      {!isShelfMode && (
        <View style={[styles.filterStatusRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Typography variant="caption" color={colors.textMuted} style={{ flex: 1 }}>
            Showing {items.length} {items.length === 1 ? 'place' : 'places'}
            {selectedSubcategory !== 'all' ? ` in ${getSubcategoryLabel(selectedSubcategory)}` : ''}
            {searchQuery ? ` matching "${searchQuery}"` : ''}
          </Typography>

          <AnimatedButton
            onPress={() => {
              setSelectedSubcategory('all');
              setSearchQuery('');
            }}
            hapticFeedback="light"
          >
            <Typography variant="caption" color={colors.primary} weight="bold">
              Show All Sections
            </Typography>
          </AnimatedButton>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Sticky / Static Header */}
      {listHeader}

      {isShelfMode ? (
        /* Discovery Mode: LegendList of Subcategory Shelves */
        <LegendList
          style={{ flex: 1 }}
          data={subcategoryShelves}
          keyExtractor={(shelf) => shelf.key}
          estimatedItemSize={180}
          recycleItems
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={{ paddingHorizontal: 16 }}>
                <StateView
                  icon="business"
                  title="No Listings Found"
                  message={
                    cityName
                      ? `No ${categoryLabel.toLowerCase()} spots currently listed in ${cityName}. Check back soon!`
                      : 'Try selecting a different subcategory or search term.'
                  }
                />
              </View>
            ) : null
          }
          renderItem={({ item: shelf }) => (
            <SubcategoryShelf
              shelf={shelf}
              onSeeAll={(subKey) => setSelectedSubcategory(subKey)}
              onCardPress={(item) =>
                router.push({
                  pathname: '/directories/[id]' as any,
                  params: { id: item.id },
                })
              }
            />
          )}
        />
      ) : (
        /* Focused Vertical List: Subcategory Filtered or Search Mode */
        <LegendList
          style={{ flex: 1 }}
          data={items}
          keyExtractor={(item) => item.id}
          estimatedItemSize={220}
          recycleItems
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={{ paddingHorizontal: 16 }}>
                <StateView
                  icon="search"
                  title="No Matching Places"
                  message="No spots found matching your search or subcategory filter."
                  actionLabel="Show All Sections"
                  onAction={() => {
                    setSelectedSubcategory('all');
                    setSearchQuery('');
                  }}
                />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <DirectoryCard
              item={item}
              onPress={() =>
                router.push({
                  pathname: '/directories/[id]' as any,
                  params: { id: item.id },
                })
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroCard: {
    marginTop: 6,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchContainer: {
    marginTop: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  filterStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 40,
    gap: 12,
  },
});
