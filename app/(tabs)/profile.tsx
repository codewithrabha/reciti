import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import { getUserReports, getTodayTrivia, submitTriviaAnswer, TIER_THRESHOLDS, getTierForPoints } from '@/lib/db';
import { Report, TriviaQuestion, Tier } from '@/types';

import { Typography } from '@/components/ui/Typography';
import { Card } from '@/components/ui/Card';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Badge } from '@/components/ui/Badge';
import { useTheme } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';

const TIER_ICONS: Record<Tier, string> = {
  Tourist: '🗺️',
  Resident: '🏘️',
  Advocate: '📣',
  Guardian: '🛡️',
};

const TIER_COLORS: Record<Tier, string> = {
  Tourist: '#64748b',
  Resident: '#3b82f6',
  Advocate: '#8b5cf6',
  Guardian: '#f59e0b',
};

const TIERS: Tier[] = ['Tourist', 'Resident', 'Advocate', 'Guardian'];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, userDoc, refreshUserDoc } = useAuth();
  const { colors, spacing, radii } = useTheme();

  const [myReports, setMyReports] = useState<Report[]>([]);
  const [trivia, setTrivia] = useState<TriviaQuestion | null>(null);
  const [triviaAnswered, setTriviaAnswered] = useState(false);
  const [triviaSelected, setTriviaSelected] = useState<number | null>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const loadData = useCallback(async () => {
    if (!user || user.isAnonymous) return;
    setLoadingReports(true);
    const [reports, todayTrivia] = await Promise.all([
      getUserReports(user.uid),
      getTodayTrivia(),
    ]);
    setMyReports(reports);
    setTrivia(todayTrivia);
    if (todayTrivia && userDoc?.completedDailyTrivia.includes(todayTrivia.id)) {
      setTriviaAnswered(true);
    }
    setLoadingReports(false);
  }, [user, userDoc]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleTriviaAnswer = async (index: number) => {
    if (!trivia || !user || triviaAnswered) return;
    setTriviaSelected(index);
    setTriviaAnswered(true);
    const isCorrect = index === trivia.correctIndex;
    await submitTriviaAnswer(user.uid, trivia.id, isCorrect);
    await refreshUserDoc();
    if (isCorrect) {
      Alert.alert('🎉 Correct!', '+5 Civic Points awarded!');
    } else {
      Alert.alert('❌ Wrong!', `The correct answer was: ${trivia.options[trivia.correctIndex]}`);
    }
  };

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

  // ── Anonymous State ──────────────────────────────────────────────────────
  if (!user || user.isAnonymous) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.anonContainer}>
          <Typography variant="h1" style={{ fontSize: 72, marginBottom: spacing.md }}>🏙️</Typography>
          <Typography variant="h1" align="center" style={{ marginBottom: spacing.sm }}>
            Join the Movement
          </Typography>
          <Typography variant="body" color={colors.textMuted} align="center" style={{ marginBottom: spacing.xl, paddingHorizontal: spacing.xl, lineHeight: 24 }}>
            Create an account to submit reports, earn Civic Points, and climb the leaderboard.
          </Typography>
          
          <AnimatedButton style={{ width: '100%', marginBottom: spacing.sm }} onPress={() => router.push('/auth/login')} hapticFeedback="light">
            <LinearGradient
              colors={['#34D399', '#059669']}
              style={styles.primaryBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="person-add-outline" size={20} color="white" />
              <Typography variant="body" weight="bold" color="white" style={{ marginLeft: spacing.sm }}>
                Create Account
              </Typography>
            </LinearGradient>
          </AnimatedButton>
          
          <AnimatedButton
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => router.push('/auth/login')}
            hapticFeedback="light"
          >
            <Typography variant="body" weight="bold">Sign In</Typography>
          </AnimatedButton>
        </View>
      </View>
    );
  }

  // ── Tier Progress ────────────────────────────────────────────────────────
  const points = userDoc?.civicPoints ?? 0;
  const tier = userDoc?.tier ?? getTierForPoints(points);
  const tierIndex = TIERS.indexOf(tier);
  const nextTier = TIERS[tierIndex + 1] as Tier | undefined;
  const currentMin = TIER_THRESHOLDS[tier];
  const nextMin = nextTier ? TIER_THRESHOLDS[nextTier] : null;
  const progress = nextMin ? Math.min((points - currentMin) / (nextMin - currentMin), 1) : 1;

  // ── Authenticated State ──────────────────────────────────────────────────
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 160 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.headerSection, { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.md }]}>
        <View style={styles.avatarRow}>
          {user.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Typography variant="h2" weight="bold" color="white">
                {(userDoc?.displayName ?? user.displayName ?? 'C').charAt(0).toUpperCase()}
              </Typography>
            </View>
          )}
          <View style={{ marginLeft: spacing.md, flex: 1 }}>
            <Typography variant="h3" weight="bold">
              {userDoc?.displayName ?? user.displayName ?? 'Citizen'}
            </Typography>
            <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
              {user.email}
            </Typography>
          </View>
          <AnimatedButton onPress={handleSignOut} disabled={signingOut} style={styles.signOutBtn} hapticFeedback="medium">
            {signingOut
              ? <ActivityIndicator size="small" color={colors.textMuted} />
              : <Ionicons name="log-out-outline" size={24} color={colors.textMuted} />
            }
          </AnimatedButton>
        </View>
      </View>

      {/* Tier + Points Card */}
      <Card style={styles.card}>
        <View style={styles.tierRow}>
          <Typography variant="h1" style={{ fontSize: 40 }}>{TIER_ICONS[tier]}</Typography>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Typography variant="h2" weight="bold" color={TIER_COLORS[tier]}>{tier}</Typography>
            <Typography variant="body" color={colors.textMuted} style={{ marginTop: 2 }}>
              {points} Civic Points
            </Typography>
          </View>
        </View>

        {/* Progress Bar */}
        {nextTier ? (
          <View style={styles.progressSection}>
            <View style={[styles.progressTrack, { backgroundColor: colors.border, borderRadius: radii.full }]}>
              <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: TIER_COLORS[tier], borderRadius: radii.full }]} />
            </View>
            <Typography variant="caption" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
              {nextMin! - points} pts to {nextTier} {TIER_ICONS[nextTier]}
            </Typography>
          </View>
        ) : (
          <Typography variant="body" weight="bold" color={TIER_COLORS.Guardian} style={{ marginTop: spacing.md }}>
            ✨ You&apos;ve reached the highest tier!
          </Typography>
        )}
      </Card>

      {/* Daily Trivia */}
      <Card style={styles.card}>
        <Typography variant="caption" weight="bold" color={colors.textMuted} style={{ letterSpacing: 1, marginBottom: spacing.md }}>
          🧠 DAILY CIVIC TRIVIA
        </Typography>
        {!trivia ? (
          <Typography variant="body" color={colors.textMuted}>No trivia available today. Check back tomorrow!</Typography>
        ) : triviaAnswered && triviaSelected === null ? (
          <Typography variant="body" color={colors.textMuted}>✅ You&apos;ve already answered today&apos;s question!</Typography>
        ) : (
          <>
            <Typography variant="body" weight="semiBold" style={{ marginBottom: spacing.md, lineHeight: 22 }}>
              {trivia.question}
            </Typography>
            {trivia.options.map((opt, idx) => {
              let optBg = 'transparent';
              let optBorder = colors.border;
              let optTextColor = colors.text;

              if (triviaAnswered) {
                if (idx === trivia.correctIndex) { optBg = colors.primaryMuted; optBorder = colors.primary; optTextColor = colors.primary; }
                else if (idx === triviaSelected) { optBg = colors.dangerMuted; optBorder = colors.danger; optTextColor = colors.danger; }
              }

              return (
                <AnimatedButton
                  key={idx}
                  onPress={() => handleTriviaAnswer(idx)}
                  disabled={triviaAnswered}
                  hapticFeedback={triviaAnswered ? 'none' : 'light'}
                  style={[styles.triviaOption, { backgroundColor: optBg, borderColor: optBorder, borderRadius: radii.md }]}
                >
                  <Typography variant="body" weight="medium" color={optTextColor}>{opt}</Typography>
                </AnimatedButton>
              );
            })}
            {!triviaAnswered && (
              <Typography variant="caption" color={colors.textMuted} align="center" style={{ marginTop: spacing.xs }}>
                +5 Civic Points for the correct answer!
              </Typography>
            )}
          </>
        )}
      </Card>

      {/* My Reports */}
      <Card style={styles.card}>
        <Typography variant="caption" weight="bold" color={colors.textMuted} style={{ letterSpacing: 1, marginBottom: spacing.md }}>
          📋 MY REPORTS ({myReports.length})
        </Typography>
        {loadingReports ? (
          <ActivityIndicator color={colors.primary} />
        ) : myReports.length === 0 ? (
          <Typography variant="body" color={colors.textMuted}>You haven&apos;t submitted any reports yet.</Typography>
        ) : (
          myReports.map((report) => (
            <View key={report.reportId} style={[styles.reportRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.reportVibeDot, { backgroundColor: report.vibe === 'win' ? colors.primary : colors.danger }]} />
              <View style={{ flex: 1 }}>
                <Typography variant="body" weight="semiBold">
                  {report.category.charAt(0).toUpperCase() + report.category.slice(1)} {report.vibe === 'win' ? 'Win' : 'Issue'}
                </Typography>
                <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                  {report.createdAt.toDate().toLocaleDateString()}
                </Typography>
              </View>
              <Badge
                label={report.status.toUpperCase()}
                variant={report.status === 'verified' ? 'primary' : report.status === 'archived' ? 'danger' : 'warning'}
              />
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Anonymous
  anonContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  primaryBtn: {
    borderRadius: 16, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  secondaryBtn: {
    borderWidth: 1.5, borderRadius: 16, paddingVertical: 16,
    width: '100%', alignItems: 'center',
  },
  // Header
  headerSection: { paddingBottom: 16 },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: {
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
  },
  signOutBtn: { padding: 8 },
  // Card
  card: { marginHorizontal: 16, marginBottom: 16 },
  // Tier
  tierRow: { flexDirection: 'row', alignItems: 'center' },
  progressSection: { marginTop: 16 },
  progressTrack: { height: 8, overflow: 'hidden' },
  progressFill: { height: '100%' },
  // Trivia
  triviaOption: {
    borderWidth: 1.5, padding: 16, marginBottom: 10,
  },
  // My Reports
  reportRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, gap: 12,
  },
  reportVibeDot: { width: 12, height: 12, borderRadius: 6 },
});
