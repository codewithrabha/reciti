import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LegendList } from '@legendapp/list';

import { Report } from '@/types';
import {
  ExploreFilter,
  flagReport,
  subscribeToExploreReports,
  toggleUpvoteReport,
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

const RADIUS_KM = 30;

type Scope = 'near' | 'all';
type Coords = { latitude: number; longitude: number };

const FILTERS: { value: ExploreFilter; label: string }[] = [
  { value: 'all', label: 'All Reports' },
  { value: 'wins', label: 'Civic Wins' },
  { value: 'issues', label: 'Open Issues' },
  { value: 'verify', label: 'Needs Verifying' },
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
    message: 'Nothing flagged here — that’s great news.',
  },
  verify: {
    title: 'Nothing to verify',
    message: 'No reports are waiting for verification right now.',
  },
};

export default function ReportListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useUser();
  const { colors, spacing, radii } = useTheme();

  const [filter, setFilter] = useState<ExploreFilter>('all');
  const [scope, setScope] = useState<Scope>('near');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationResolved, setLocationResolved] = useState(false);

  const [reports, setReports] = useState<Report[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const fetchLocation = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationGranted(status === 'granted');
      if (status !== 'granted') {
        setCoords(null);
        setCityName(null);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;
      setCoords({ latitude, longitude });

      try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        const resolved = results[0]?.city ?? results[0]?.subregion ?? results[0]?.district ?? null;
        setCityName(resolved);
      } catch {
        // fallback
      }
    } catch {
      setCoords(null);
      setCityName(null);
    } finally {
      setLocationResolved(true);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  useEffect(() => {
    if (!locationResolved) return;
    setReports(null);
    setError(false);

    const opts =
      scope === 'near' && coords
        ? { center: coords, radiusKm: RADIUS_KM, filter }
        : { filter };

    return subscribeToExploreReports(
      setReports,
      opts,
      () => setError(true),
    );
  }, [coords, filter, scope, retryKey, locationResolved]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLocation();
    setRefreshing(false);
  }, [fetchLocation]);

  const retry = () => setRetryKey((k) => k + 1);

  const handleVerify = async (reportId: string) => {
    if (!user) return;
    try {
      await verifyReport(reportId, user.uid);
    } catch (e) {
      console.warn('[ReportList] Verify failed:', e);
    }
  };

  const handleFlag = async (reportId: string) => {
    if (!user) return;
    try {
      await flagReport(reportId, user.uid);
    } catch (e) {
      console.warn('[ReportList] Flag failed:', e);
    }
  };

  const handleUpvote = async (reportId: string) => {
    if (!user) return;
    try {
      await toggleUpvoteReport(reportId, user.uid);
    } catch (e) {
      console.warn('[ReportList] Upvote failed:', e);
    }
  };

  const listHeader = (
    <View style={styles.headerControls}>
      {/* Scope toggle: Near you vs All */}
      <View style={[styles.scopeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <AnimatedButton
          onPress={() => setScope('near')}
          style={[
            styles.scopeBtn,
            scope === 'near' && { backgroundColor: colors.primary },
          ]}
        >
          <Ionicons
            name="map"
            size={14}
            color={scope === 'near' ? colors.white : colors.textMuted}
          />
          <Typography
            variant="caption"
            weight="bold"
            color={scope === 'near' ? colors.white : colors.textMuted}
            style={{ marginLeft: 4 }}
          >
            {cityName ? `Near ${cityName}` : 'Near you'}
          </Typography>
        </AnimatedButton>

        <AnimatedButton
          onPress={() => setScope('all')}
          style={[
            styles.scopeBtn,
            scope === 'all' && { backgroundColor: colors.primary },
          ]}
        >
          <Ionicons
            name="earth"
            size={14}
            color={scope === 'all' ? colors.white : colors.textMuted}
          />
          <Typography
            variant="caption"
            weight="bold"
            color={scope === 'all' ? colors.white : colors.textMuted}
            style={{ marginLeft: 4 }}
          >
            All Areas
          </Typography>
        </AnimatedButton>
      </View>

      {/* Filter Chips */}
      <View style={{ marginTop: spacing.sm, marginBottom: spacing.xs }}>
        <FilterChips
          options={FILTERS}
          value={filter}
          onChange={setFilter}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top App Bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <AnimatedButton
          onPress={() => router.back()}
          hapticFeedback="light"
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </AnimatedButton>

        <View style={{ flex: 1 }}>
          <Typography variant="h2">Civic Reports</Typography>
          <Typography variant="caption" color={colors.textMuted}>
            {reports ? `${reports.length} report${reports.length === 1 ? '' : 's'}` : 'Loading...'}
          </Typography>
        </View>

        <AnimatedButton
          onPress={() => router.push('/(tabs)/capture')}
          hapticFeedback="light"
          style={[styles.captureIconBtn, { backgroundColor: colors.primaryMuted }]}
          accessibilityLabel="Report an issue"
        >
          <Ionicons name="camera" size={18} color={colors.primary} />
        </AnimatedButton>
      </View>

      {/* Content */}
      {error ? (
        <StateView
          icon="cloud-offline"
          tone="error"
          title="Couldn’t load reports"
          message="Check your connection and try again."
          actionLabel="Retry"
          onAction={retry}
        />
      ) : reports === null ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.skeletonContainer}
        >
          {listHeader}
          <ReportCardSkeleton />
          <ReportCardSkeleton />
        </Animated.View>
      ) : (
        <LegendList
          data={reports}
          keyExtractor={(item) => item.reportId}
          estimatedItemSize={290}
          recycleItems
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <StateView
              icon="leaf"
              title={EMPTY[filter].title}
              message={EMPTY[filter].message}
            />
          }
          renderItem={({ item: report }) => (
            <View style={{ marginBottom: 16 }}>
              <ReportCard
                report={report}
                onPress={() =>
                  router.push({
                    pathname: '/report/[id]',
                    params: { id: report.reportId },
                  })
                }
                onVerify={() => handleVerify(report.reportId)}
                onFlag={() => handleFlag(report.reportId)}
                onUpvote={() => handleUpvote(report.reportId)}
                isUpvoted={report.upvotedBy?.includes(user?.uid ?? '')}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  captureIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerControls: {
    paddingTop: 12,
    paddingBottom: 6,
  },
  scopeRow: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
  },
  scopeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  skeletonContainer: {
    paddingHorizontal: 16,
  },
});
