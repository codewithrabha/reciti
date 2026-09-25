import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LegendList } from '@legendapp/list/react-native';

import { BusinessDirectoryItem, DirectoryCategory, DirectorySubcategory, UserEntitlement } from '@/types';
import {
  getCategoryLabel,
  getDirectoryCategories,
  getDirectoryItems,
  getSubcategoriesForCategory,
  normalizeCategory,
  subscribeDynamicCategories,
} from '@/lib/directoryService';
import {
  subscribeUserEntitlement,
  createDefaultEntitlement,
} from '@/lib/referralService';
import { canViewLandlordContact } from '@/lib/entitlementRules';
import { useUser } from '@/store/authStore';
import { useLocationStore } from '@/store/locationStore';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { StateView } from '@/components/ui/StateView';
import { DirectoryCard } from '@/components/directories/DirectoryCard';
import { HousingListingCard } from '@/components/housing/HousingListingCard';
import { HousingUnlockModal } from '@/components/housing/HousingUnlockModal';
import { CategoryShelf, CategoryShelfData } from '@/components/directories/CategoryShelf';
import { CategoryFilterModal } from '@/components/directories/CategoryFilterModal';

export default function DirectoriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, spacing } = useTheme();

  const cityName = useLocationStore((s) => s.cityName);
  const user = useUser();
  const [entitlement, setEntitlement] = useState<UserEntitlement | null>(null);
  const [housingUnlockModalVisible, setHousingUnlockModalVisible] = useState(false);

  const [categoryOptions, setCategoryOptions] = useState(() => getDirectoryCategories());
  const [selectedCategory, setSelectedCategory] = useState<DirectoryCategory | 'all'>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<DirectorySubcategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<BusinessDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Subscribe to user housing entitlement
  useEffect(() => {
    if (!user?.uid) {
      setEntitlement(createDefaultEntitlement(''));
      return;
    }
    const unsub = subscribeUserEntitlement(user.uid, (ent) => {
      setEntitlement(ent);
    });
    return () => unsub();
  }, [user?.uid]);

  const isHousingUnlocked = canViewLandlordContact(entitlement);

  // Subscribe to real-time dynamic taxonomy changes from Admin
  useEffect(() => {
    const unsub = subscribeDynamicCategories(() => {
      setCategoryOptions(getDirectoryCategories());
    });
    return () => unsub();
  }, []);

  const activeSubcategories = React.useMemo(() => {
    if (selectedCategory === 'all') return [];
    return getSubcategoriesForCategory(selectedCategory);
  }, [selectedCategory, categoryOptions]);

  const handleSelectCategory = (catKey: DirectoryCategory | 'all') => {
    setSelectedCategory(catKey);
    setSelectedSubcategory('all');
  };

  const loadData = useCallback(async () => {
    try {
      const data = await getDirectoryItems(
        selectedCategory,
        searchQuery,
        cityName ?? undefined,
        selectedSubcategory
      );
      setItems(data);
    } catch (err) {
      console.error('[Directories] Error loading items:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedSubcategory, searchQuery, cityName]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const currentCategoryLabel = getCategoryLabel(selectedCategory);
  const isDiscoveryMode = selectedCategory === 'all' && searchQuery.trim().length === 0;

  // Group listings into master category shelves for Discovery Mode
  const categoryShelves = React.useMemo<CategoryShelfData[]>(() => {
    if (!isDiscoveryMode) return [];

    const grouped: Record<string, BusinessDirectoryItem[]> = {};
    for (const item of items) {
      const normCat = normalizeCategory(item.category);
      if (!grouped[normCat]) grouped[normCat] = [];
      grouped[normCat].push(item);
    }

    const shelves: CategoryShelfData[] = [];
    const addedKeys = new Set<string>();

    // Add shelves based on defined category options order
    for (const opt of categoryOptions) {
      if (opt.key === 'all') continue;
      const catItems = grouped[opt.key] || [];
      if (catItems.length > 0) {
        shelves.push({
          key: opt.key as DirectoryCategory,
          label: opt.label,
          icon: opt.icon,
          items: catItems,
        });
        addedKeys.add(opt.key);
      }
    }

    // Add any remaining categories that have items but weren't in categoryOptions
    for (const [key, catItems] of Object.entries(grouped)) {
      if (!addedKeys.has(key) && catItems.length > 0) {
        shelves.push({
          key: key as DirectoryCategory,
          label: getCategoryLabel(key),
          icon: 'grid-outline',
          items: catItems,
        });
      }
    }

    return shelves;
  }, [isDiscoveryMode, items, categoryOptions]);

  const listHeader = (
    <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={{ paddingHorizontal: 16 }}>
        <Typography variant="h1">City Directory</Typography>
        <Typography variant="body" color={colors.textMuted} style={{ marginTop: 2 }}>
          {cityName
            ? `Discover local services, eateries, and spots in ${cityName}.`
            : 'Discover local businesses, health centers, and community services.'}
        </Typography>

        {/* Search & Filter Row */}
        <View style={styles.searchRow}>
          {/* Search Bar */}
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              placeholder="Search stores, healthcare, markets..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {searchQuery.length > 0 && (
              <AnimatedButton onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </AnimatedButton>
            )}
          </View>

          {/* Filter Button */}
          <AnimatedButton
            onPress={() => setFilterModalVisible(true)}
            style={[
              styles.filterButton,
              {
                backgroundColor: selectedCategory !== 'all' ? colors.primary : colors.surface,
                borderColor: selectedCategory !== 'all' ? colors.primary : colors.border,
              },
            ]}
          >
            <Ionicons
              name={selectedCategory !== 'all' ? 'funnel' : 'options-outline'}
              size={18}
              color={selectedCategory !== 'all' ? colors.white : colors.text}
            />
            {selectedCategory !== 'all' && (
              <View style={[styles.filterIndicator, { backgroundColor: colors.white }]} />
            )}
          </AnimatedButton>
        </View>
      </View>

      {/* Housing Community Notice Banner (when housing is selected) */}
      {selectedCategory === 'housing_rentals' && (
        <View
          style={[
            styles.housingNoticeBanner,
            {
              backgroundColor: isHousingUnlocked ? '#10B98115' : colors.primaryMuted,
              borderColor: isHousingUnlocked ? '#10B98140' : colors.primary + '30',
            },
          ]}
        >
          <Ionicons
            name={isHousingUnlocked ? 'shield-checkmark' : 'lock-closed'}
            size={18}
            color={isHousingUnlocked ? '#10B981' : colors.primary}
          />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Typography variant="caption" weight="bold" color={isHousingUnlocked ? '#10B981' : colors.primary}>
              {isHousingUnlocked ? 'Civic Rental Access Unlocked' : 'Community Zero-Broker Rentals'}
            </Typography>
            <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 11, marginTop: 1 }}>
              {isHousingUnlocked
                ? 'You have direct access to owner phone numbers & verified stay intel.'
                : 'Invite 3 friends or share your current PG/flat stay to unlock contacts.'}
            </Typography>
          </View>
          {!isHousingUnlocked && (
            <AnimatedButton
              onPress={() => setHousingUnlockModalVisible(true)}
              style={[styles.unlockMiniBtn, { backgroundColor: colors.primary }]}
            >
              <Typography variant="caption" weight="bold" color="#FFFFFF" style={{ fontSize: 11 }}>
                Unlock
              </Typography>
            </AnimatedButton>
          )}
        </View>
      )}

      {/* Secondary Subcategories Horizontal Scroll (when a category is selected) */}
      {activeSubcategories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subcategoriesScroll}
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
                  name={sub.icon as any}
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
            Showing {items.length} {items.length === 1 ? 'spot' : 'spots'}{' '}
            {selectedCategory !== 'all' ? `in ${currentCategoryLabel}` : ''}
            {searchQuery ? ` matching "${searchQuery}"` : ''}
          </Typography>
          <AnimatedButton onPress={() => handleSelectCategory('all')}>
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
          estimatedItemSize={180}
          recycleItems
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          overScrollMode={'never'}
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
                      ? `No local spots currently listed in ${cityName}. Check back soon!`
                      : 'Try selecting a different category or search term.'
                  }
                />
              </View>
            ) : null
          }
          renderItem={({ item: shelf }) => (
            <CategoryShelf
              shelf={shelf}
              onSeeAll={(catKey) => handleSelectCategory(catKey)}
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
        /* Filtered / Search Mode: Focused Vertical List with Subcategories */
        <LegendList
          style={{ flex: 1 }}
          data={items}
          keyExtractor={(item) => item.id}
          estimatedItemSize={220}
          recycleItems
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          overScrollMode={'never'}
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
                  title="No Listings Found"
                  message={
                    cityName
                      ? `No local spots listed in ${cityName} matching your filter.`
                      : 'Try searching for another service or select a different category.'
                  }
                />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
              {item.category === 'housing_rentals' ? (
                <HousingListingCard
                  item={item}
                  isUnlocked={isHousingUnlocked}
                  onPress={() =>
                    router.push({
                      pathname: '/directories/[id]' as any,
                      params: { id: item.id },
                    })
                  }
                  onUnlockPress={() => setHousingUnlockModalVisible(true)}
                />
              ) : (
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
            </View>
          )}
        />
      )}

      {/* Category Filter Bottom Sheet Modal */}
      <CategoryFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        categoryOptions={categoryOptions}
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => {
          handleSelectCategory(cat);
        }}
        subcategories={activeSubcategories}
        selectedSubcategory={selectedSubcategory}
        onSelectSubcategory={(sub) => {
          setSelectedSubcategory(sub);
        }}
        onClearFilter={() => {
          handleSelectCategory('all');
        }}
      />

      {/* Housing Unlock Modal */}
      <HousingUnlockModal
        visible={housingUnlockModalVisible}
        onClose={() => setHousingUnlockModalVisible(false)}
        user={user}
        entitlement={entitlement}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    paddingBottom: 100,
  },
  housingNoticeBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  unlockMiniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },
});
