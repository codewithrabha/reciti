import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LegendList } from '@legendapp/list';

import { CityEvent, EventCategory } from '@/types';
import { EVENT_CATEGORIES, getUpcomingEvents } from '@/lib/eventService';
import { useLocationStore } from '@/store/locationStore';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { StateView } from '@/components/ui/StateView';
import { EventCard } from '@/components/events/EventCard';

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, spacing } = useTheme();

  const cityName = useLocationStore((s) => s.cityName);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<CityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getUpcomingEvents(selectedCategory, searchQuery, cityName ?? undefined);
      setEvents(data);
    } catch (err) {
      console.error('[Events] Error loading items:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery, cityName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const listHeader = (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <Typography variant="h1">Public Events</Typography>
      <Typography variant="body" color={colors.textMuted} style={{ marginTop: 2 }}>
        Civic events, cultural gatherings, sports, and city fairs and more.
      </Typography>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: spacing.sm }]}>
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

      {/* Categories Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScroll}
      >
        {EVENT_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.key;
          return (
            <AnimatedButton
              key={cat.key}
              onPress={() => setSelectedCategory(cat.key)}
              style={[
                styles.categoryPill,
                {
                  backgroundColor: isSelected ? colors.primary : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <Ionicons
                name={cat.icon as any}
                size={15}
                color={isSelected ? colors.white : colors.textMuted}
              />
              <Typography
                variant="caption"
                weight="bold"
                color={isSelected ? colors.white : colors.text}
                style={{ marginLeft: 6 }}
              >
                {cat.label}
              </Typography>
            </AnimatedButton>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <LegendList
        data={events}
        keyExtractor={(item) => item.id}
        estimatedItemSize={310}
        recycleItems
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
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
                  : "No upcoming events match your search or filter."
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 14,
    marginBottom: 12,
  },
  searchBar: {
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
  categoriesScroll: {
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
});
