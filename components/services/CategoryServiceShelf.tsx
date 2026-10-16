import React from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ServiceItem } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { ServiceCard } from './ServiceCard';

interface CategoryServiceShelfProps {
  services: ServiceItem[];
  categoryLabel?: string;
  serviceCategoryId?: string;
  onBookPress?: (item: ServiceItem) => void;
}

export function CategoryServiceShelf({
  services,
  categoryLabel,
  serviceCategoryId,
  onBookPress,
}: CategoryServiceShelfProps) {
  const router = useRouter();
  const { colors } = useTheme();

  // If no services are linked to this category, collapse completely with zero footprint
  if (!services || services.length === 0) {
    return null;
  }

  // 6-Grid Logic:
  // If > 5 services, show top 5 + 1 "+count More" card = 6 total items.
  // If exactly 5 services, show 5 + 1 "Explore All" card = 6 total items.
  // If < 5 services, show all of them.
  const hasMore = services.length > 5;
  const showExploreSlot = services.length === 5;
  const displayedServices = hasMore ? services.slice(0, 5) : services.slice(0, 6);
  const remainingCount = services.length - 5;

  const showMoreCard = hasMore || showExploreSlot;

  // Window width calculation for 3 columns with 8px gap
  // Parent headerWrapper has paddingHorizontal: 16 (total 32px), 2 gaps of 8px (total 16px)
  const windowWidth = Dimensions.get('window').width;
  const cardWidth = Math.floor((windowWidth - 32 - 16) / 3);

  const handleNavigateToServices = () => {
    const targetCat = serviceCategoryId || services[0]?.categoryId;
    if (targetCat) {
      router.push({
        pathname: '/services/category/[slug]',
        params: { slug: targetCat },
      } as any);
    } else {
      router.push('/services' as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* Shelf Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name="flash" size={15} color={colors.primary} />
          </View>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Typography variant="h3" style={{ fontSize: 16, fontWeight: '800' }}>
                Related Services.
              </Typography>
            </View>
            <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 1, fontSize: 11 }}>
              Do enquiry or book a service directly.
            </Typography>
          </View>
        </View>

        {/* View All Services Link */}
        <Pressable
          onPress={handleNavigateToServices}
          hitSlop={8}
          style={styles.seeAllButton}
        >
          <Typography
            variant="caption"
            weight="bold"
            style={{ color: colors.primary, fontSize: 12, marginRight: 2 }}
          >
            All
          </Typography>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      </View>

      {/* 2-Column Grid (Up to 6 Items) */}
      <View style={styles.gridContainer}>
        {displayedServices.map((service) => (
          <View key={service.id} style={{ width: cardWidth }}>
            <ServiceCard
              item={service}
              variant="grid"
              onPress={(item) =>
                router.push({
                  pathname: '/services/[id]',
                  params: { id: item.id },
                } as any)
              }
              onBookPress={onBookPress}
            />
          </View>
        ))}

        {/* 6th Slot: +Count More / Explore All Card */}
        {showMoreCard && (
          <View style={{ width: cardWidth }}>
            <Pressable
              onPress={handleNavigateToServices}
              style={({ pressed }) => [
                styles.moreCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.primary + '40',
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View style={[styles.moreIconCircle, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="apps" size={16} color={colors.primary} />
              </View>

              <Typography
                variant="h2"
                style={{
                  color: colors.primary,
                  fontSize: 16,
                  fontWeight: '800',
                  marginTop: 4,
                }}
              >
                {remainingCount > 0 ? `+${remainingCount}` : 'All'}
              </Typography>

              <Typography
                variant="caption"
                weight="bold"
                numberOfLines={1}
                style={{ color: colors.text, fontSize: 10, marginTop: 1 }}
              >
                {remainingCount > 0 ? 'More' : 'Explore All'}
              </Typography>

              <View style={styles.viewCatalogRow}>
                <Typography
                  variant="caption"
                  style={{ color: colors.primary, fontSize: 9, fontWeight: '700' }}
                >
                  View All
                </Typography>
                <Ionicons
                  name="arrow-forward"
                  size={10}
                  color={colors.primary}
                  style={{ marginLeft: 2 }}
                />
              </View>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moreCard: {
    width: '100%',
    minHeight: 122,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  moreIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewCatalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
});
