import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

import { CityEvent, EventCategory, EventSubcategory } from '@/types';
import {
  EVENT_SECTORS,
  EventCategoryMeta,
  getUpcomingEvents,
  getEventCategoryMeta,
  getEventCategoryLabel,
  subscribeDynamicEventCategories,
} from '@/lib/eventService';
import { useLocationStore } from '@/store/locationStore';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { StateView } from '@/components/ui/StateView';
import { EventCard } from '@/components/events/EventCard';
import { EventFilterModal } from '@/components/events/EventFilterModal';

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, spacing } = useTheme();

  const cityName = useLocationStore((s) => s.cityName);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'all'>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<EventSubcategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<CityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [dynamicSectors, setDynamicSectors] = useState<EventCategoryMeta[]>(EVENT_SECTORS);

  // Subscribe to dynamic event categories from Firestore
  useEffect(() => {
    const unsub = subscribeDynamicEventCategories((loaded) => {
      setDynamicSectors(loaded);
    });
    return () => unsub();
  }, []);

  // Active category metadata and subcategories
  const activeCategoryMeta = useMemo(() => {
    if (selectedCategory === 'all') return undefined;
    return (
      dynamicSectors.find((s) => s.key === selectedCategory) ||
      getEventCategoryMeta(selectedCategory)
    );
  }, [selectedCategory, dynamicSectors]);

  const activeSubcategories = useMemo(() => {
    return activeCategoryMeta?.subcategories || [];
  }, [activeCategoryMeta]);

  const currentCategoryLabel = useMemo(() => {
    return getEventCategoryLabel(selectedCategory === 'all' ? undefined : selectedCategory);
  }, [selectedCategory]);

  const categoryOptions = useMemo(() => {
    return dynamicSectors.map((s) => ({
      key: s.key,
      label: s.label,
      icon: s.icon,
    }));
  }, [dynamicSectors]);

  const loadData = useCallback(async () => {
    try {
      const data = await getUpcomingEvents(
        selectedCategory,
        selectedSubcategory,
        searchQuery,
        cityName ?? undefined
      );
      setEvents(data);
    } catch (err) {
      console.error('[Events] Error loading items:', err);
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

  const handleSelectCategory = (cat: EventCategory | 'all') => {
    setSelectedCategory(cat);
    setSelectedSubcategory('all');
  };

  const handleSelectSubcategory = (sub: EventSubcategory | 'all') => {
    setSelectedSubcategory(sub);
  };

  const handleClearFilters = () => {
    setSelectedCategory('all');
    setSelectedSubcategory('all');
    setSearchQuery('');
  };

  const isFiltered = selectedCategory !== 'all' || selectedSubcategory !== 'all';

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* ── Sticky Header (Mounted outside LegendList) ── */}
      <View
        style={[
          styles.stickyHeader,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        {/* Title row */}
        <Typography variant="h1">Public Events</Typography>
        <Typography variant="body" color={colors.textMuted} style={{ marginTop: 2 }}>
          {cityName
            ? `Festivals, tournaments, and community events in ${cityName}.`
            : 'Civic festivals, sports, cultural shows, and community drives.'}
        </Typography>

        {/* Search & Filter Row */}
        <View style={styles.searchRow}>
          {/* Search Bar */}
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              placeholder="Search events, venues, organizers..."
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
                backgroundColor: isFiltered ? colors.primary : colors.surface,
                borderColor: isFiltered ? colors.primary : colors.border,
              },
            ]}
          >
            <Ionicons
              name={isFiltered ? 'funnel' : 'options-outline'}
              size={18}
              color={isFiltered ? colors.white : colors.text}
            />
            {isFiltered && (
              <View style={[styles.filterIndicator, { backgroundColor: colors.white }]} />
            )}
          </AnimatedButton>
        </View>

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
                  backgroundColor:
                    selectedSubcategory === 'all' ? colors.primary + '1A' : colors.surface,
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
      </View>

      {/* ── Events List ── */}
      <LegendList
        data={events}
        keyExtractor={(item) => item.id}
        estimatedItemSize={310}
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
            <StateView
              icon="calendar"
              title="No Events Found"
              message={
                cityName
                  ? `No upcoming events in ${cityName} matching your search or filter.`
                  : 'No upcoming events match your search or filter.'
              }
            />
          ) : null
        }
        renderItem={({ item }) => (
          <View style={{ marginBottom: 16 }}>
            <EventCard
              item={item}
              onPress={() =>
                router.push({
                  pathname: '/events/[id]' as any,
                  params: { id: item.id },
                })
              }
            />
          </View>
        )}
      />

      {/* ── Category & Subcategory Filter Modal ── */}
      <EventFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        categoryOptions={categoryOptions}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        subcategories={activeSubcategories}
        selectedSubcategory={selectedSubcategory}
        onSelectSubcategory={handleSelectSubcategory}
        onClearFilter={handleClearFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stickyHeader: {
    paddingHorizontal: 16,
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
    borderRadius: 10,
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
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subcategoriesScroll: {
    paddingTop: 10,
    paddingBottom: 2,
    gap: 8,
  },
  subcategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 100,
  },
});
