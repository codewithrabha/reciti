import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LegendList } from '@legendapp/list';

import { useUser, useUserDoc, useRefreshUserDoc } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import { getLeaderboard, getUserReports } from '@/lib/db';
import { Report, ReportStatus, User } from '@/types';
import { TierProgress } from '@/components/pulse/TierProgress';
import { StatCard } from '@/components/pulse/StatCard';
import { LeaderboardRow } from '@/components/profile/LeaderboardRow';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { StateView } from '@/components/ui/StateView';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

const GRADIENT = ['#34D399', '#10B981', '#059669'] as const;

/** Stable empty reference so the list doesn't see a new array each render. */
const NO_REPORTS: Report[] = [];

const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: 'Pending',
  verified: 'Verified',
  in_progress: 'In progress',
  resolved: 'Resolved',
  archived: 'Removed',
};

const STATUS_VARIANT: Record<ReportStatus, 'primary' | 'warning' | 'danger' | 'default'> = {
  pending: 'warning',
  verified: 'primary',
  in_progress: 'warning',
  resolved: 'primary',
  archived: 'danger',
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * A single "your reports" row. Memoized so the virtualized list can recycle
 * rows without re-rendering unchanged items. `isFirst`/`isLast` round the ends
 * so the list still reads as one joined card.
 */
const ReportRow = React.memo(function ReportRow({
  report,
  isFirst,
  isLast,
}: {
  report: Report;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const { colors, radii } = useTheme();
  return (
    <AnimatedButton
      onPress={() =>
        router.push({ pathname: '/report/[id]', params: { id: report.reportId } })
      }
      hapticFeedback="light"
      scaleTo={0.99}
      style={[
        styles.reportRow,
        { backgroundColor: colors.surface },
        isFirst && { borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
        isLast && { borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg },
        !isFirst && { borderTopColor: colors.border, borderTopWidth: 1 },
      ]}
    >
      <View
        style={[
          styles.vibeDot,
          { backgroundColor: report.vibe === 'win' ? colors.primary : colors.danger },
        ]}
      />
      <View style={styles.reportInfo}>
        <Typography variant="body" weight="semiBold">
          {cap(report.category)} {report.vibe === 'win' ? 'win' : 'issue'}
        </Typography>
        <Typography variant="caption" color={colors.textMuted}>
          {report.createdAt.toDate().toLocaleDateString()}
        </Typography>
      </View>
      <Badge label={STATUS_LABEL[report.status]} variant={STATUS_VARIANT[report.status]} />
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </AnimatedButton>
  );
});

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useUser();
  const userDoc = useUserDoc();
  const refreshUserDoc = useRefreshUserDoc();
  const { colors, spacing, radii } = useTheme();

  const [myReports, setMyReports] = useState<Report[]>([]);
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    if (!user || user.isAnonymous) return;
    setLoading(true);
    setError(false);
    try {
      const [reports, board] = await Promise.all([
        getUserReports(user.uid),
        getLeaderboard(),
      ]);
      setMyReports(reports);
      setLeaderboard(board);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(), refreshUserDoc()]);
    setRefreshing(false);
  }, [loadData, refreshUserDoc]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      Alert.alert('Error', 'Sign out failed. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: handleSignOut },
    ]);
  };

  /* ----------------------------- guest state ----------------------------- */

  if (!user || user.isAnonymous) {
    return (
      <View style={[styles.container, styles.anon, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <LinearGradient
          colors={GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.anonOrb}
        >
          <Ionicons name="trophy" size={52} color="#FFFFFF" />
        </LinearGradient>
        <Typography variant="h1" align="center" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
          Join the movement
        </Typography>
        <Typography
          variant="body"
          color={colors.textMuted}
          align="center"
          style={{ marginBottom: spacing.xl }}
        >
          Create an account to submit reports, earn Civic Points, and climb from
          Tourist to Guardian.
        </Typography>

        <AnimatedButton
          style={{ width: '100%', marginBottom: spacing.sm }}
          onPress={() => router.push('/auth/login')}
          hapticFeedback="medium"
        >
          <LinearGradient
            colors={['#34D399', '#059669']}
            style={styles.primaryBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
            <Typography variant="body" weight="bold" color="#FFFFFF">
              Create account
            </Typography>
          </LinearGradient>
        </AnimatedButton>
        <AnimatedButton
          style={[styles.secondaryBtn, { borderColor: colors.border, borderRadius: radii.md }]}
          onPress={() => router.push('/auth/login')}
          hapticFeedback="light"
        >
          <Typography variant="body" weight="bold">
            Sign in
          </Typography>
        </AnimatedButton>
      </View>
    );
  }

  /* --------------------------- authenticated ----------------------------- */

  const name = userDoc?.displayName ?? user.displayName ?? 'Citizen';
  const reportsFiled = myReports.length;
  const winsLogged = myReports.filter((r) => r.vibe === 'win').length;
  const verifiedCount = myReports.filter((r) =>
    ['verified', 'in_progress', 'resolved'].includes(r.status),
  ).length;
  const resolvedCount = myReports.filter((r) => r.status === 'resolved').length;

  // Only feed real rows to the list — error/loading/empty render elsewhere.
  const reportsData = error ? NO_REPORTS : myReports;

  // Everything above "your reports" scrolls with the list as its header.
  const listHeader = (
    <>
      {/* Tier */}
      <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionLabel}>
        YOUR CLIMB
      </Typography>
      <TierProgress userDoc={userDoc} />

      {error ? (
        <View style={styles.errorWrap}>
          <StateView
            icon="cloud-offline"
            tone="error"
            title="Couldn’t load your profile"
            message="Something went wrong. Check your connection and try again."
            actionLabel="Retry"
            onAction={loadData}
          />
        </View>
      ) : (
        <>
          {/* Impact */}
          <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionLabel}>
            YOUR IMPACT
          </Typography>
          <View style={styles.statRow}>
            <StatCard icon="document-text" value={reportsFiled} label="Reports filed" tint="primary" />
            <StatCard icon="leaf" value={winsLogged} label="Wins logged" tint="primary" />
          </View>
          <View style={styles.statRow}>
            <StatCard icon="checkmark-circle" value={verifiedCount} label="Verified" tint="primary" />
            <StatCard icon="sparkles" value={resolvedCount} label="Resolved" tint="primary" />
          </View>

          {/* Leaderboard */}
          <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionLabel}>
            LEADERBOARD
          </Typography>
          {loading && leaderboard.length === 0 ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : leaderboard.length === 0 ? (
            <Card padding="none">
              <StateView
                compact
                icon="podium-outline"
                title="No rankings yet"
                message="The leaderboard is just getting started — keep earning points."
              />
            </Card>
          ) : (
            leaderboard.map((u, i) => (
              <LeaderboardRow
                key={u.uid}
                rank={i + 1}
                user={u}
                isCurrentUser={u.uid === user.uid}
              />
            ))
          )}

          {/* My reports */}
          <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionLabel}>
            YOUR REPORTS ({reportsFiled})
          </Typography>
        </>
      )}
    </>
  );

  // Reports states shown in place of the rows when there are none.
  const listEmpty = error ? null : loading ? (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} />
    </View>
  ) : (
    <Card padding="none">
      <StateView
        compact
        icon="camera-outline"
        title="No reports yet"
        message="You haven’t submitted any reports yet. Capture your first one."
      />
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={styles.header}>
          {user.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.primary }]}>
              <Typography variant="h2" weight="bold" color="#FFFFFF">
                {name.charAt(0).toUpperCase()}
              </Typography>
            </View>
          )}
          <View style={styles.headerText}>
            <Typography variant="h3" weight="bold" numberOfLines={1}>
              {name}
            </Typography>
            {!!user.email && (
              <Typography variant="caption" color={colors.textMuted} numberOfLines={1}>
                {user.email}
              </Typography>
            )}
          </View>
          <AnimatedButton
            onPress={confirmSignOut}
            disabled={signingOut}
            hapticFeedback="medium"
            style={styles.signOutBtn}
          >
            {signingOut ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <Ionicons name="log-out-outline" size={24} color={colors.textMuted} />
            )}
          </AnimatedButton>
        </View>
      </View>

      <LegendList
        data={reportsData}
        renderItem={({ item, index }) => (
          <ReportRow
            report={item}
            isFirst={index === 0}
            isLast={index === reportsData.length - 1}
          />
        )}
        keyExtractor={(item) => item.reportId}
        estimatedItemSize={64}
        recycleItems
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 120 },

  // Guest
  anon: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  anonOrb: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
  },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 2 },
  signOutBtn: { padding: 8 },

  // Sections
  sectionLabel: { letterSpacing: 1, marginTop: 24, marginBottom: 10 },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  loading: { paddingVertical: 32, alignItems: 'center' },

  // Sections
  errorWrap: { marginTop: 24 },
  // Reports
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  vibeDot: { width: 10, height: 10, borderRadius: 5 },
  reportInfo: { flex: 1, gap: 1 },
});
