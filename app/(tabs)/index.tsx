import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { Report } from '@/types';
import {
  PulseStats,
  flagReport,
  subscribeToPulseStats,
  subscribeToVerificationQueue,
  verifyReport,
} from '@/lib/db';
import { useUser, useUserDoc } from '@/hooks/useAuth';
import { ReportCard } from '@/components/ReportCard';
import { PulseHero } from '@/components/pulse/PulseHero';
import { StatCard } from '@/components/pulse/StatCard';
import { TierProgress } from '@/components/pulse/TierProgress';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { StateView } from '@/components/ui/StateView';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

const RADIUS_KM = 5;

type Coords = { latitude: number; longitude: number };

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function PulseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useUser();
  const userDoc = useUserDoc();
  const { colors, spacing } = useTheme();

  const [coords, setCoords] = useState<Coords | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [stats, setStats] = useState<PulseStats | null>(null);
  const [pending, setPending] = useState<Report[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const fetchLocation = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationGranted(status === 'granted');
      if (status !== 'granted') {
        setCoords(null);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    } catch {
      setCoords(null);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  // Real-time pulse stats — re-subscribes when the area changes or on retry.
  useEffect(() => {
    setStats(null);
    setError(false);
    const opts = coords ? { center: coords, radiusKm: RADIUS_KM } : {};
    return subscribeToPulseStats(setStats, opts, () => setError(true));
  }, [coords, retryKey]);

  // Real-time verification queue — top 3 pending reports, excluding the user's own.
  useEffect(() => {
    return subscribeToVerificationQueue(
      setPending,
      {
        excludeUid: user?.uid,
        max: 3,
        ...(coords ? { center: coords, radiusKm: RADIUS_KM } : {}),
      },
      () => setError(true),
    );
  }, [coords, user?.uid, retryKey]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLocation();
    setRefreshing(false);
  }, [fetchLocation]);

  const retry = () => setRetryKey((k) => k + 1);

  const enableLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        await fetchLocation();
      } else {
        setLocationGranted(false);
      }
    } catch {
      // Permission flow failed — leave the area unscoped.
    }
  };

  const handleVerify = async (reportId: string) => {
    if (!user) return;
    await verifyReport(reportId, user.uid);
  };

  const handleFlag = async (reportId: string) => {
    if (!user) return;
    await flagReport(reportId, user.uid);
  };

  const name = userDoc?.displayName?.split(' ')[0] ?? 'there';
  const activeCount = stats ? stats.openIssues + stats.wins : 0;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >

      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Typography variant="body" color={colors.textMuted}>
          {getGreeting()},
        </Typography>
        <Typography variant="h1" style={{ marginBottom: spacing.sm }}>
          {name}
        </Typography>

        <AnimatedButton
          onPress={locationGranted ? undefined : enableLocation}
          disabled={locationGranted}
          hapticFeedback={locationGranted ? 'none' : 'light'}
          style={styles.locationChip}
        >
          <Ionicons
            name={coords ? 'location' : 'location-outline'}
            size={14}
            color={coords ? colors.primary : colors.textMuted}
          />
          <Typography
            variant="caption"
            weight="semiBold"
            color={coords ? colors.primary : colors.textMuted}
          >
            {coords
              ? `Within ${RADIUS_KM} km of you`
              : 'Enable location for your area'}
          </Typography>
        </AnimatedButton>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        overScrollMode='never'
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >

        {error ? (
          <StateView
            icon="cloud-offline"
            tone="error"
            title="Couldn’t load your pulse"
            message="Something went wrong reading reports nearby. Check your connection and try again."
            actionLabel="Retry"
            onAction={retry}
          />
        ) : stats === null ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <View style={{ marginTop: spacing.md }}>
              <PulseHero
                activeCount={activeCount}
                thisWeek={stats.thisWeek}
                lastWeek={stats.lastWeek}
              />
            </View>

            {/* Honest raw stats */}
            <View style={[styles.statRow, { marginTop: spacing.md }]}>
              <StatCard icon="leaf" value={stats.wins} label="Civic wins" tint="primary" />
              <StatCard
                icon="warning"
                value={stats.openIssues}
                label="Open issues"
                tint="danger"
              />
            </View>
            <View style={styles.statRow}>
              <StatCard
                icon="trending-up"
                value={stats.thisWeek}
                label="New this week"
                tint="primary"
              />
              <StatCard
                icon="eye"
                value={stats.pendingVerification}
                label="Need verifying"
                tint="warning"
              />
            </View>

            {/* Tier ladder */}
            <Typography
              variant="caption"
              weight="bold"
              color={colors.textMuted}
              style={styles.sectionLabel}
            >
              YOUR CLIMB
            </Typography>
            <TierProgress userDoc={userDoc} />

            {/* Verification bridge */}
            <Typography
              variant="caption"
              weight="bold"
              color={colors.textMuted}
              style={styles.sectionLabel}
            >
              REPORTS THAT NEED YOU
            </Typography>
            {pending.length === 0 ? (
              <StateView
                compact
                icon="checkmark-done-circle"
                title="All clear nearby"
                message="No reports are waiting for verification in your area."
              />
            ) : (
              pending.map((report) => (
                <ReportCard
                  key={report.reportId}
                  report={report}
                  isRadarView
                  onPress={() =>
                    router.push({
                      pathname: '/report/[id]',
                      params: { id: report.reportId },
                    })
                  }
                  onVerify={() => handleVerify(report.reportId)}
                  onFlag={() => handleFlag(report.reportId)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 120 },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  loading: { paddingVertical: 80, alignItems: 'center' },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  sectionLabel: { letterSpacing: 1, marginTop: 20, marginBottom: 10 },
});
