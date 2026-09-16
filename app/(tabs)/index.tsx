import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LegendList } from "@legendapp/list/react-native";

import { BusinessDirectoryItem, CityEvent, CityNotice, Report } from "@/types";
import { subscribeToExploreReports } from "@/lib/db";
import { getDirectoryItems } from "@/lib/directoryService";
import { getUpcomingEvents } from "@/lib/eventService";
import { getCityNotices } from "@/lib/noticeService";
import { useUser, useUserDoc } from "@/hooks/useAuth";
import { useLocationStore } from "@/store/locationStore";
import { CivicPulseCard } from "@/components/pulse/CivicPulseCard";
import { EventTeaserCard } from "@/components/pulse/EventTeaserCard";
import { BusinessTeaserCard } from "@/components/pulse/BusinessTeaserCard";
import { NoticeBoardCarousel } from "@/components/home/NoticeBoardCarousel";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { StateView } from "@/components/ui/StateView";
import { Typography } from "@/components/ui/Typography";
import { PulseStatsSkeleton } from "@/components/skeletons";
import { useTheme } from "@/theme";

const RADIUS_KM = 30;

export default function PulseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useUser();
  const userDoc = useUserDoc();
  const { colors, spacing, radii } = useTheme();

  const coords = useLocationStore((s) => s.coords);
  const cityName = useLocationStore((s) => s.cityName);
  const locationGranted = useLocationStore((s) => s.locationGranted);
  const locationResolved = useLocationStore((s) => s.locationResolved);
  const fetchLocation = useLocationStore((s) => s.fetchLocation);
  const requestPermissionAndFetch = useLocationStore((s) => s.requestPermissionAndFetch);

  const [recentReports, setRecentReports] = useState<Report[] | null>(null);
  const [events, setEvents] = useState<CityEvent[]>([]);
  const [businesses, setBusinesses] = useState<BusinessDirectoryItem[]>([]);
  const [notices, setNotices] = useState<CityNotice[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  // Load events, businesses & notices for the home screen, filtered by current city
  const loadTeasers = useCallback(async (currentCity?: string | null) => {
    try {
      const city = currentCity ?? undefined;
      const [evts, biz, cityNotices] = await Promise.all([
        getUpcomingEvents('all', undefined, city),
        getDirectoryItems('all', undefined, city),
        getCityNotices(city),
      ]);

      // If city has matching items, show them; otherwise fallback to all upcoming/directories
      // so carousels don't appear empty if a city has no mock data yet.
      const finalEvts = evts.length > 0 ? evts : await getUpcomingEvents();
      const finalBiz = biz.length > 0 ? biz : await getDirectoryItems();

      setEvents(finalEvts.slice(0, 5));
      setBusinesses(finalBiz.slice(0, 5));
      setNotices(cityNotices);
    } catch (e) {
      console.warn("[PulseScreen] Error loading teasers:", e);
    }
  }, []);

  useEffect(() => {
    loadTeasers(cityName);
  }, [loadTeasers, cityName, retryKey]);

  // Real-time recent reports (max 6 cards of civic issues & wins)
  useEffect(() => {
    if (!locationResolved) return;
    setRecentReports(null);
    setError(false);
    const opts = {
      ...(coords ? { center: coords, radiusKm: RADIUS_KM } : {}),
      filter: "all" as const,
    };
    return subscribeToExploreReports(
      (reports) => setRecentReports(reports.slice(0, 6)),
      opts,
      () => setError(true),
    );
  }, [coords, retryKey, locationResolved]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchLocation(true), loadTeasers(cityName)]);
    setRefreshing(false);
  }, [fetchLocation, loadTeasers, cityName]);

  const retry = () => setRetryKey((k) => k + 1);

  const enableLocation = async () => {
    await requestPermissionAndFetch();
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={styles.headerRow}>
          {/* Logo with "ReCiti" Brand Text */}
          <View style={styles.brandRow}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.logo}
              contentFit="cover"
            />
            <Typography variant="h1" style={styles.brandTitle}>
              ReCiti
            </Typography>
          </View>
          <NotificationBell />
        </View>

        <View style={{ height: spacing.xs }} />

        {/* City Location Chip */}
        <AnimatedButton
          onPress={locationGranted ? undefined : enableLocation}
          disabled={locationGranted}
          hapticFeedback={locationGranted ? "none" : "light"}
          style={styles.locationChip}
        >
          <Ionicons
            name={cityName ? "map" : "map-outline"}
            size={14}
            color={cityName ? colors.primary : colors.textMuted}
          />
          <Typography
            variant="caption"
            weight="semiBold"
            color={cityName ? colors.primary : colors.textMuted}
          >
            {cityName ?? (coords ? "Nearby" : "Enable location for your city")}
          </Typography>
        </AnimatedButton>
      </View>

      {error ? (
        <StateView
          icon="cloud-offline"
          tone="error"
          title="Couldn’t load your city pulse"
          message="Something went wrong connecting nearby. Check your connection and try again."
          actionLabel="Retry"
          onAction={retry}
        />
      ) : recentReports === null ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={{ paddingHorizontal: 16, paddingTop: 16 }}
        >
          <PulseStatsSkeleton />
        </Animated.View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <Animated.View entering={FadeIn.duration(200)}>
            {/* Dynamic City Notice Board Hero Carousel */}
            <NoticeBoardCarousel notices={notices} cityName={cityName} />

            {/* 1. Civic Health: Horizontal Scroll (Max 6 cards) */}
            <View style={[styles.sectionHeaderRow, { marginTop: spacing.md }]}>
              <View style={{ width: "70%" }}>
                <Typography variant="subtitle">Civic Health</Typography>
                <Typography variant="caption" color={colors.textMuted}>
                  Serious city issues & wins nearby.
                </Typography>
              </View>

              <AnimatedButton
                onPress={() => router.push("/reports" as any)}
                style={styles.seeAllBtn}
              >
                <Typography
                  variant="caption"
                  weight="bold"
                  color={colors.primary}
                >
                  See all
                </Typography>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </AnimatedButton>

            </View>

            {recentReports.length === 0 ? (
              <View
                style={[
                  styles.emptyStateCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radii.lg,
                  },
                ]}
              >
                <StateView
                  compact
                  icon="earth"
                  title="No reports nearby"
                  message="Be the first to capture a civic issue or win in your area."
                />
              </View>
            ) : (
              <LegendList
                horizontal
                style={styles.carouselContainer}
                contentContainerStyle={styles.horizontalCarousel}
                data={recentReports}
                keyExtractor={(report) => report.reportId}
                estimatedItemSize={252}
                recycleItems
                showsHorizontalScrollIndicator={false}
                renderItem={({ item: report }) => (
                  <CivicPulseCard
                    key={report.reportId}
                    report={report}
                    onPress={() =>
                      router.push({
                        pathname: "/report/[id]",
                        params: { id: report.reportId },
                      })
                    }
                  />
                )}
              />
            )}

            {/* 2. Happening Around You (Events Carousel) */}
            <View style={[styles.sectionHeaderRow, { marginTop: spacing.lg }]}>
              <View style={{ width: "70%" }}>
                <Typography variant="subtitle">Happening around you</Typography>
                <Typography variant="caption" color={colors.textMuted}>
                  Civic events, cultural fairs, sports & more.
                </Typography>
              </View>
              <AnimatedButton
                onPress={() => router.push("/events" as any)}
                style={styles.seeAllBtn}
              >
                <Typography
                  variant="caption"
                  weight="bold"
                  color={colors.primary}
                >
                  See all
                </Typography>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </AnimatedButton>
            </View>

            {events.length === 0 ? (
              <View
                style={[
                  styles.emptyStateCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radii.lg,
                  },
                ]}
              >
                <StateView
                  compact
                  icon="calendar-outline"
                  title="No upcoming events"
                  message="There are no scheduled events right now. Stay tuned for community fairs and gatherings!"
                />
              </View>
            ) : (
              <LegendList
                horizontal
                style={styles.carouselContainer}
                contentContainerStyle={styles.horizontalCarousel}
                data={events}
                keyExtractor={(event) => event.id}
                estimatedItemSize={252}
                recycleItems
                showsHorizontalScrollIndicator={false}
                renderItem={({ item: event }) => (
                  <EventTeaserCard
                    key={event.id}
                    event={event}
                    onPress={() =>
                      router.push({
                        pathname: "/events/[id]" as any,
                        params: { id: event.id },
                      })
                    }
                  />
                )}
              />
            )}

            {/* 3. Local Spots & Findings (Business Directory Teaser) */}
            <View style={[styles.sectionHeaderRow, { marginTop: spacing.lg }]}>
              <View style={{ width: "70%" }}>
                <Typography variant="subtitle">Local spots & findings</Typography>
                <Typography variant="caption" color={colors.textMuted}>
                  Explore businesses,  health centers, institutes and etc.
                </Typography>
              </View>

              <AnimatedButton
                onPress={() => router.push("/directories" as any)}
                style={styles.seeAllBtn}
              >
                <Typography
                  variant="caption"
                  weight="bold"
                  color={colors.primary}
                >
                  See all
                </Typography>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </AnimatedButton>
            </View>

            {businesses.length === 0 ? (
              <View
                style={[
                  styles.emptyStateCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radii.lg,
                  },
                ]}
              >
                <StateView
                  compact
                  icon="storefront-outline"
                  title="No local spots listed yet"
                  message="Verified local shops, health centers and public services will appear here soon."
                />
              </View>
            ) : (
              <LegendList
                horizontal
                style={styles.carouselContainer}
                contentContainerStyle={styles.horizontalCarousel}
                data={businesses}
                keyExtractor={(biz) => biz.id}
                estimatedItemSize={252}
                recycleItems
                showsHorizontalScrollIndicator={false}
                renderItem={({ item: biz }) => (
                  <BusinessTeaserCard
                    key={biz.id}
                    business={biz}
                    onPress={() =>
                      router.push({
                        pathname: "/directories/[id]" as any,
                        params: { id: biz.id },
                      })
                    }
                  />
                )}
              />
            )}
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 120 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandTitle: {
    fontSize: 22,
    letterSpacing: -0.4,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  carouselContainer: {
    height: 245,
  },
  horizontalCarousel: {
    paddingRight: 8,
  },
  emptyStateCard: {
    borderWidth: 1,
    marginVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
});
