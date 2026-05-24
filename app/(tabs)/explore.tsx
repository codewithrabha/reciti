import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { Report } from '@/types';
import {
  ExploreFilter,
  flagReport,
  subscribeToExploreReports,
  verifyReport,
} from '@/lib/db';
import { useUser } from '@/hooks/useAuth';
import { ReportCard } from '@/components/ReportCard';
import { FilterChips } from '@/components/explore/FilterChips';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { StateView } from '@/components/ui/StateView';
import { Typography } from '@/components/ui/Typography';
import { ReportCardSkeleton } from '@/components/skeletons';
import { useTheme } from '@/theme';

const RADIUS_KM = 5;

type Mode = 'feed' | 'map';
type Scope = 'near' | 'all';
type Coords = { latitude: number; longitude: number };

const FILTERS: { value: ExploreFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'wins', label: 'Wins' },
  { value: 'issues', label: 'Issues' },
  { value: 'verify', label: 'Needs verifying' },
];

const EMPTY: Record<ExploreFilter, { title: string; message: string }> = {
  all: {
    title: 'No reports yet',
    message: 'Be the first to capture a civic win or issue here.',
  },
  wins: {
    title: 'No wins yet',
    message: 'No civic wins have been logged in this area.',
  },
  issues: {
    title: 'No open issues',
    message: 'Nothing flagged here — that’s good news.',
  },
  verify: {
    title: 'Nothing to verify',
    message: 'No reports are waiting for verification right now.',
  },
};

/** Stand-in for the real map until react-native-maps / expo-maps is wired up. */
function MapPlaceholder({
  count,
  onBrowse,
}: {
  count: number;
  onBrowse: () => void;
}) {
  const { colors, radii, spacing } = useTheme();
  return (
    <View style={styles.center}>
      <View style={[styles.mapIcon, { backgroundColor: colors.primaryMuted }]}>
        <Ionicons name="map" size={56} color={colors.primary} />
      </View>
      <Typography variant="h3" weight="bold" align="center" style={{ marginTop: spacing.lg }}>
        Map view is coming soon
      </Typography>
      <Typography
        variant="body"
        color={colors.textMuted}
        align="center"
        style={{ marginTop: spacing.xs }}
      >
        {count > 0
          ? `${count} report${count === 1 ? '' : 's'} in this area will appear as pins here. For now, browse them in the Feed.`
          : 'Reports will appear as pins here. For now, browse them in the Feed.'}
      </Typography>
      <AnimatedButton
        onPress={onBrowse}
        hapticFeedback="light"
        style={[styles.browseBtn, { backgroundColor: colors.primary, borderRadius: radii.md }]}
      >
        <Ionicons name="list" size={18} color={colors.white} />
        <Typography variant="body" weight="bold" color={colors.white}>
          Browse the Feed
        </Typography>
      </AnimatedButton>
    </View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useUser();
  const { colors, radii } = useTheme();

  const [mode, setMode] = useState<Mode>('feed');
  const [filter, setFilter] = useState<ExploreFilter>('all');
  const [scope, setScope] = useState<Scope>('all');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);

  const fetchLocation = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCoords(null);
        return false;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      return true;
    } catch {
      setCoords(null);
      return false;
    }
  }, []);

  // If location was already granted (onboarding / Pulse), default to a near-me scope.
  useEffect(() => {
    fetchLocation().then((ok) => {
      if (ok) setScope('near');
    });
  }, [fetchLocation]);

  useEffect(() => {
    if (!isRefreshingRef.current) setReports(null);
    setError(false);
    const area =
      scope === 'near' && coords ? { center: coords, radiusKm: RADIUS_KM } : {};
    const finishRefresh = () => {
      if (isRefreshingRef.current) {
        isRefreshingRef.current = false;
        setRefreshing(false);
      }
    };
    return subscribeToExploreReports(
      (next) => {
        setReports(next);
        finishRefresh();
      },
      { filter, ...area },
      () => {
        setError(true);
        finishRefresh();
      },
    );
  }, [filter, scope, coords, retryKey]);

  const retry = () => setRetryKey((k) => k + 1);

  const onRefresh = useCallback(async () => {
    isRefreshingRef.current = true;
    setRefreshing(true);
    if (scope === 'near') {
      await fetchLocation();
    }
    setRetryKey((k) => k + 1);
  }, [scope, fetchLocation]);

  const toggleScope = async () => {
    if (scope === 'near') {
      setScope('all');
      return;
    }
    if (coords) {
      setScope('near');
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted' && (await fetchLocation())) {
      setScope('near');
    }
  };

  const handleVerify = async (reportId: string) => {
    if (user) await verifyReport(reportId, user.uid);
  };
  const handleFlag = async (reportId: string) => {
    if (user) await flagReport(reportId, user.uid);
  };

  const nearActive = scope === 'near' && !!coords;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Typography variant="h1">Explore</Typography>
        <AnimatedButton
          onPress={toggleScope}
          hapticFeedback="light"
          style={[styles.scopePill, { borderColor: colors.border }]}
        >
          <Ionicons
            name={nearActive ? 'location' : 'earth'}
            size={14}
            color={nearActive ? colors.primary : colors.textMuted}
          />
          <Typography
            variant="caption"
            weight="semiBold"
            color={nearActive ? colors.primary : colors.textMuted}
          >
            {nearActive ? `${RADIUS_KM} km` : 'Everywhere'}
          </Typography>
        </AnimatedButton>
      </View>

      {/* Map / Feed toggle */}
      <View
        style={[
          styles.segment,
          { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md },
        ]}
      >
        {(['map', 'feed'] as Mode[]).map((m) => {
          const active = mode === m;
          return (
            <AnimatedButton
              key={m}
              onPress={() => setMode(m)}
              hapticFeedback="light"
              scaleTo={0.98}
              style={[
                styles.segmentBtn,
                { borderRadius: radii.sm },
                active && { backgroundColor: colors.primary },
              ]}
            >
              <Ionicons
                name={m === 'map' ? 'map' : 'list'}
                size={16}
                color={active ? colors.white : colors.textMuted}
              />
              <Typography
                variant="caption"
                weight="bold"
                color={active ? colors.white : colors.textMuted}
              >
                {m === 'map' ? 'Map' : 'Feed'}
              </Typography>
            </AnimatedButton>
          );
        })}
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      </View>

      {/* Body */}
      {error ? (
        <View style={styles.center}>
          <StateView
            icon="cloud-offline"
            tone="error"
            title="Couldn’t load reports"
            message="Something went wrong loading the feed. Check your connection and try again."
            actionLabel="Retry"
            onAction={retry}
          />
        </View>
      ) : reports === null ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.list}
        >
          <ReportCardSkeleton count={3} />
        </Animated.View>
      ) : mode === 'map' ? (
        <MapPlaceholder count={reports.length} onBrowse={() => setMode('feed')} />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.reportId}
          renderItem={({ item }) => (
            <ReportCard
              report={item}
              isRadarView={item.status === 'pending'}
              onPress={() =>
                router.push({
                  pathname: '/report/[id]',
                  params: { id: item.reportId },
                })
              }
              onVerify={() => handleVerify(item.reportId)}
              onFlag={() => handleFlag(item.reportId)}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.list,
            reports.length === 0 && styles.listEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <StateView
                icon="leaf-outline"
                title={EMPTY[filter].title}
                message={EMPTY[filter].message}
              />
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  scopePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 9999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  segment: {
    flexDirection: 'row',
    marginHorizontal: 16,
    padding: 4,
    borderWidth: 1,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
  },
  filters: { paddingLeft: 16, marginTop: 12, marginBottom: 4 },
  list: { padding: 16, paddingBottom: 120 },
  listEmpty: { flexGrow: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  mapIcon: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 24,
  },
});
