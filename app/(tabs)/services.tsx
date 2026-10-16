import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LegendList } from '@legendapp/list/react-native';

import { ServiceItem } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { StateView } from '@/components/ui/StateView';
import { ServiceCard } from '@/components/services/ServiceCard';
import { ServiceCategoryShelf, ServiceCategoryShelfData } from '@/components/services/ServiceCategoryShelf';
import { ServiceCategoryFilterModal } from '@/components/services/ServiceCategoryFilterModal';
import { useLocationStore } from '@/store/locationStore';
import { subscribeAllActiveServices } from '@/lib/serviceBookingService';
import { subscribeServiceCategories, ServiceCategoryMeta } from '@/lib/serviceTaxonomyService';

export default function ServicesTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { category: initialCategory, subcategory: initialSubcategory } = useLocalSearchParams<{
    category?: string;
    subcategory?: string;
  }>();
  const { colors } = useTheme();
  const cityName = useLocationStore((s) => s.cityName);

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryMeta[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(initialSubcategory || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Subscribe to service categories
  useEffect(() => {
    const unsub = subscribeServiceCategories((cats) => {
      setCategories(cats);
    });
    return unsub;
  }, []);

  // Subscribe to active services
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeAllActiveServices((list) => {
      setServices(list);
      setLoading(false);
      setRefreshing(false);
    }, cityName || undefined);

    return unsub;
  }, [cityName]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleSelectCategory = (catKey: string) => {
    setSelectedCategory(catKey);
    setSelectedSubcategory('all');
  };

  const currentCategoryObj = useMemo(() => {
    return categories.find((c) => c.key === selectedCategory);
  }, [categories, selectedCategory]);

  const currentCategoryLabel = currentCategoryObj?.label || 'All Services';

  const activeSubcategories = useMemo(() => {
    if (selectedCategory === 'all') return [];
    return currentCategoryObj?.subcategories || [];
  }, [selectedCategory, currentCategoryObj]);

  const isDiscoveryMode = selectedCategory === 'all' && searchQuery.trim().length === 0;

  // Group services into master category shelves for Discovery Mode
  const categoryShelves = useMemo<ServiceCategoryShelfData[]>(() => {
    if (!isDiscoveryMode) return [];

    const grouped: Record<string, ServiceItem[]> = {};
    for (const item of services) {
      const catKey = item.categoryId || 'other';
      if (!grouped[catKey]) grouped[catKey] = [];
      grouped[catKey].push(item);
    }

    const shelves: ServiceCategoryShelfData[] = [];
    const addedKeys = new Set<string>();

    // 1. Defined categories order
    for (const cat of categories) {
      if (cat.key === 'all') continue;
      const catItems = grouped[cat.key] || [];
      if (catItems.length > 0) {
        shelves.push({
          key: cat.key,
          label: cat.label,
          icon: cat.icon || 'construct-outline',
          imageUrl: cat.imageUrl,
          items: catItems,
        });
        addedKeys.add(cat.key);
      }
    }

    // 2. Remaining categories with items
    for (const [key, catItems] of Object.entries(grouped)) {
      if (!addedKeys.has(key) && catItems.length > 0) {
        shelves.push({
          key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          icon: 'construct-outline',
          items: catItems,
        });
      }
    }

    return shelves;
  }, [isDiscoveryMode, services, categories]);

  // Filtered services for Search / Category Focus Mode
  const filteredServices = useMemo(() => {
    if (isDiscoveryMode) return [];

    return services.filter((s) => {
      const matchCategory =
        selectedCategory === 'all' || s.categoryId === selectedCategory;
      const matchSubcategory =
        selectedSubcategory === 'all' || s.subcategoryId === selectedSubcategory;
      const matchSearch =
        searchQuery.trim().length === 0 ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.providerName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchCategory && matchSubcategory && matchSearch;
    });
  }, [isDiscoveryMode, services, selectedCategory, selectedSubcategory, searchQuery]);

  const handleCardPress = (item: ServiceItem) => {
    router.push({
      pathname: '/services/[id]' as any,
      params: { id: item.id },
    });
  };

  const isFiltered = selectedCategory !== 'all' || selectedSubcategory !== 'all';

  // List Header (Consistent with directories.tsx layout and aesthetics)
  const listHeader = (
    <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={{ paddingHorizontal: 16 }}>
        {/* Title & Subtitle */}
        <Typography variant="h1">City Services</Typography>
        <Typography variant="body" color={colors.textMuted} style={{ marginTop: 2 }}>
          {cityName
            ? `Discover and book verified local experts and services in ${cityName}.`
            : 'Discover and book verified local experts and community services.'}
        </Typography>

        {/* Search & Filter Row */}
        <View style={styles.searchRow}>
          {/* Search Bar */}
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              placeholder="Search services, electricians, tutors..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {searchQuery.length > 0 && (
              <AnimatedButton onPress={() => setSearchQuery('')} hapticFeedback="light">
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </AnimatedButton>
            )}
          </View>

          {/* Filter Button with active indicator dot */}
          <AnimatedButton
            onPress={() => setFilterModalVisible(true)}
            style={[
              styles.filterButton,
              {
                backgroundColor: isFiltered ? colors.primary : colors.surface,
                borderColor: isFiltered ? colors.primary : colors.border,
              },
            ]}
          >
            <Ionicons
              name={isFiltered ? 'funnel' : 'options-outline'}
              size={18}
              color={isFiltered ? '#fff' : colors.text}
            />
            {isFiltered && (
              <View style={[styles.filterIndicator, { backgroundColor: '#fff' }]} />
            )}
          </AnimatedButton>
        </View>
      </View>

      {/* Secondary Subcategories Horizontal Scroll (when a category is selected) */}
      {activeSubcategories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subcategoriesScroll}
          overScrollMode="never"
        >
          <AnimatedButton
            onPress={() => setSelectedSubcategory('all')}
            style={[
              styles.subcategoryPill,
              {
                backgroundColor: selectedSubcategory === 'all' ? colors.primary + '1A' : colors.surface,
                borderColor: selectedSubcategory === 'all' ? colors.primary : colors.border,
              },
            ]}
          >
            <Typography
              variant="caption"
              weight={selectedSubcategory === 'all' ? 'bold' : 'regular'}
              color={selectedSubcategory === 'all' ? colors.primary : colors.textMuted}
            >
              All {currentCategoryLabel}
            </Typography>
          </AnimatedButton>

          {activeSubcategories.map((sub) => {
            const isSubSelected = selectedSubcategory === sub.key;
            return (
              <AnimatedButton
                key={sub.key}
                onPress={() => setSelectedSubcategory(sub.key)}
                style={[
                  styles.subcategoryPill,
                  {
                    backgroundColor: isSubSelected ? colors.primary + '1A' : colors.surface,
                    borderColor: isSubSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={(sub.icon || 'construct-outline') as any}
                  size={13}
                  color={isSubSelected ? colors.primary : colors.textMuted}
                  style={{ marginRight: 5 }}
                />
                <Typography
                  variant="caption"
                  weight={isSubSelected ? 'bold' : 'regular'}
                  color={isSubSelected ? colors.primary : colors.text}
                >
                  {sub.label}
                </Typography>
              </AnimatedButton>
            );
          })}
        </ScrollView>
      )}

      {/* Filter Mode Breadcrumb Header */}
      {!isDiscoveryMode && (
        <View style={styles.filterMetaRow}>
          <Typography variant="caption" color={colors.textMuted} weight="medium">
            Showing {filteredServices.length} {filteredServices.length === 1 ? 'service' : 'services'}{' '}
            {selectedCategory !== 'all' ? `in ${currentCategoryLabel}` : ''}
            {searchQuery ? ` matching "${searchQuery}"` : ''}
          </Typography>
          <AnimatedButton
            onPress={() => {
              handleSelectCategory('all');
              setSearchQuery('');
            }}
            hapticFeedback="light"
          >
            <Typography variant="caption" color={colors.primary} weight="bold">
              Show All
            </Typography>
          </AnimatedButton>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Sticky Header */}
      {listHeader}

      {isDiscoveryMode ? (
        /* Discovery Mode: Master Categories with Horizontal Card Shelves */
        <LegendList
          style={{ flex: 1 }}
          data={categoryShelves}
          keyExtractor={(shelf) => shelf.key}
          estimatedItemSize={250}
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
                  icon="construct-outline"
                  title="No Services Found"
                  message={
                    cityName
                      ? `No local services currently available in ${cityName}. Check back soon!`
                      : 'Try selecting a different category or search term.'
                  }
                />
              </View>
            ) : null
          }
          renderItem={({ item: shelf }) => (
            <ServiceCategoryShelf
              shelf={shelf}
              onSeeAll={(catKey) =>
                router.push({
                  pathname: '/services/category/[slug]' as any,
                  params: { slug: catKey },
                })
              }
              onCardPress={handleCardPress}
            />
          )}
        />
      ) : (
        /* Filtered / Search Mode: Focused Vertical List of Service Cards */
        <LegendList
          style={{ flex: 1 }}
          data={filteredServices}
          keyExtractor={(item) => item.id}
          estimatedItemSize={240}
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
                  title="No Services Found"
                  message={
                    cityName
                      ? `No local services listed in ${cityName} matching your filter.`
                      : 'Try searching for another keyword or select a different category.'
                  }
                  actionLabel="Show All Services"
                  onAction={() => {
                    handleSelectCategory('all');
                    setSearchQuery('');
                  }}
                />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16, marginBottom: 14 }}>
              <ServiceCard
                item={item}
                variant="list"
                onPress={handleCardPress}
              />
            </View>
          )}
        />
      )}

      {/* Category Filter Bottom Sheet Modal */}
      <ServiceCategoryFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        subcategories={activeSubcategories}
        selectedSubcategory={selectedSubcategory}
        onSelectSubcategory={setSelectedSubcategory}
        onClearFilter={() => handleSelectCategory('all')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  searchBar: {
    flex: 1,
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
    paddingVertical: 0,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterIndicator: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subcategoriesScroll: {
    paddingTop: 10,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  subcategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  filterMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 100, // accommodate bottom tab bar
  },
});
