import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  RefreshControl,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LegendList } from '@legendapp/list/react-native';

import { ServiceItem } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { StateView } from '@/components/ui/StateView';
import { ServiceCard } from '@/components/services/ServiceCard';
import {
  ServiceSubcategoryShelf,
  ServiceSubcategoryShelfData,
} from '@/components/services/ServiceSubcategoryShelf';
import { useLocationStore } from '@/store/locationStore';
import {
  getServiceCategoryMeta,
  subscribeServiceCategories,
  ServiceCategoryMeta,
} from '@/lib/serviceTaxonomyService';
import { subscribeServicesByCategory } from '@/lib/serviceBookingService';

export default function ServiceCategoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const cityName = useLocationStore((s) => s.cityName);

  const { slug, subcategory: initialSubcat } = useLocalSearchParams<{
    slug: string;
    subcategory?: string;
  }>();

  const categorySlug = slug || 'home_repairs';

  const [categoryMeta, setCategoryMeta] = useState<ServiceCategoryMeta | undefined>(() =>
    getServiceCategoryMeta(categorySlug)
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(
    initialSubcat || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Subscribe to dynamic service category metadata updates from Firestore
  useEffect(() => {
    setCategoryMeta(getServiceCategoryMeta(categorySlug));
    const unsub = subscribeServiceCategories(() => {
      setCategoryMeta(getServiceCategoryMeta(categorySlug));
    });
    return unsub;
  }, [categorySlug]);

  // Subscribe to active services belonging to this category in Firestore
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeServicesByCategory(
      categorySlug,
      (data) => {
        setServices(data);
        setLoading(false);
        setRefreshing(false);
      },
      cityName ?? undefined
    );
    return unsub;
  }, [categorySlug, cityName]);

  const categoryLabel = categoryMeta?.label || categorySlug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const categoryIcon = categoryMeta?.icon || 'construct-outline';

  const onRefresh = async () => {
    setRefreshing(true);
    // Subscriptions update automatically, but resetting refreshing state
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleShare = async () => {
    try {
      const shareUrl = `https://reciti.in/services/category/${categorySlug}`;
      await Share.share({
        title: `${categoryLabel} Services - ReCiti`,
        message: `Explore bookable ${categoryLabel} services in ${cityName || 'your city'} on ReCiti: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (err) {
      console.warn('[ServiceCategoryScreen] Share error:', err);
    }
  };

  // Helper to find human-readable subcategory label
  const getSubcatLabel = useCallback(
    (key: string) => {
      const match = categoryMeta?.subcategories?.find((s) => s.key === key);
      if (match) return match.label;
      return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    },
    [categoryMeta]
  );

  // Determine whether to show Subcategory Shelves or Focused Vertical List
  const isShelfMode = selectedSubcategory === 'all' && searchQuery.trim().length === 0;

  // Filtered services for Focused List Mode
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchSub =
        selectedSubcategory === 'all' || s.subcategoryId === selectedSubcategory;
      const matchSearch =
        searchQuery.trim().length === 0 ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.providerName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSub && matchSearch;
    });
  }, [services, selectedSubcategory, searchQuery]);

  // Group services by subcategory into LegendList shelves (for Discovery Mode)
  const subcategoryShelves = useMemo<ServiceSubcategoryShelfData[]>(() => {
    if (!isShelfMode) return [];

    const grouped: Record<string, ServiceItem[]> = {};
    for (const item of services) {
      const subKey = item.subcategoryId || 'general';
      if (!grouped[subKey]) grouped[subKey] = [];
      grouped[subKey].push(item);
    }

    const shelves: ServiceSubcategoryShelfData[] = [];
    const addedKeys = new Set<string>();

    // 1. Add configured subcategories in order
    const subcats = categoryMeta?.subcategories || [];
    for (const sub of subcats) {
      const subItems = grouped[sub.key] || [];
      if (subItems.length > 0) {
        shelves.push({
          key: sub.key,
          label: sub.label,
          icon: sub.icon || 'construct-outline',
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
          label: getSubcatLabel(key) || 'Other Services',
          icon: 'construct-outline',
          items: subItems,
        });
      }
    }

    return shelves;
  }, [isShelfMode, services, categoryMeta, getSubcatLabel]);

  const handleCardPress = (item: ServiceItem) => {
    router.push({
      pathname: '/services/[id]' as any,
      params: { id: item.id },
    });
  };

  // Header Component
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

        <View style={{ marginLeft: 12, flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Typography variant="h2" style={{ fontSize: 20, fontWeight: '800' }}>
              {categoryLabel}
            </Typography>
          </View>
          <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
            {services.length} {services.length === 1 ? 'service' : 'services'}{' '}
            {cityName ? `in ${cityName}` : 'available'}
          </Typography>
        </View>

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

      {/* Category Hero Artwork Banner */}
      {categoryMeta?.bannerImageUrl ? (
        <View style={styles.heroCard}>
          <Image
            source={{ uri: categoryMeta.bannerImageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.85)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            {categoryMeta.badgeText ? (
              <View style={styles.heroBadge}>
                <Ionicons name="sparkles" size={10} color="#FBBF24" style={{ marginRight: 4 }} />
                <Typography variant="caption" weight="bold" style={{ color: '#FBBF24', fontSize: 10 }}>
                  {categoryMeta.badgeText.toUpperCase()}
                </Typography>
              </View>
            ) : null}
            <Typography variant="h3" style={styles.heroTitle} numberOfLines={1}>
              {categoryLabel}
            </Typography>
            {categoryMeta.description ? (
              <Typography variant="caption" style={styles.heroDescription} numberOfLines={2}>
                {categoryMeta.description}
              </Typography>
            ) : null}
          </View>
        </View>
      ) : null}

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

      {/* Active Filter Bar (when a specific subcategory or search is selected) */}
      {!isShelfMode && (
        <View style={[styles.filterStatusRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Typography variant="caption" color={colors.textMuted} style={{ flex: 1 }}>
            Showing {filteredServices.length}{' '}
            {filteredServices.length === 1 ? 'service' : 'services'}
            {selectedSubcategory !== 'all' ? ` in ${getSubcatLabel(selectedSubcategory)}` : ''}
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
                  title="No Services Listed"
                  message={
                    cityName
                      ? `No ${categoryLabel.toLowerCase()} services currently available in ${cityName}. Check back soon!`
                      : 'Try selecting a different subcategory or search term.'
                  }
                />
              </View>
            ) : null
          }
          renderItem={({ item: shelf }) => (
            <ServiceSubcategoryShelf
              shelf={shelf}
              onSeeAll={(subKey) => setSelectedSubcategory(subKey)}
              onCardPress={handleCardPress}
            />
          )}
        />
      ) : (
        /* Focused Vertical List: Subcategory Filtered or Search Mode */
        <LegendList
          style={{ flex: 1 }}
          data={filteredServices}
          keyExtractor={(item) => item.id}
          estimatedItemSize={240}
          recycleItems
          contentContainerStyle={[styles.listContent, { paddingHorizontal: 16 }]}
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
                  title="No Matching Services"
                  message="No services found matching your search or subcategory filter."
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
            <ServiceCard
              item={item}
              variant="list"
              onPress={handleCardPress}
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
  heroCard: {
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 4,
    justifyContent: 'flex-end',
  },
  heroContent: {
    padding: 14,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  heroDescription: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
});
