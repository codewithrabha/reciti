import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  ActivityIndicator, useColorScheme, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import { getUserReports, getTodayTrivia, submitTriviaAnswer, TIER_THRESHOLDS, getTierForPoints } from '@/lib/db';
import { Report, TriviaQuestion, Tier } from '@/types';

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
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  const [myReports, setMyReports] = useState<Report[]>([]);
  const [trivia, setTrivia] = useState<TriviaQuestion | null>(null);
  const [triviaAnswered, setTriviaAnswered] = useState(false);
  const [triviaSelected, setTriviaSelected] = useState<number | null>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const bg = dark ? '#0f172a' : '#f8fafc';
  const cardBg = dark ? '#1e293b' : '#ffffff';
  const textPrimary = dark ? '#f1f5f9' : '#0f172a';
  const textMuted = dark ? '#94a3b8' : '#64748b';
  const border = dark ? '#334155' : '#e2e8f0';

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
      <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
        <View style={styles.anonContainer}>
          <Text style={styles.anonEmoji}>🏙️</Text>
          <Text style={[styles.anonTitle, { color: textPrimary }]}>Join the Movement</Text>
          <Text style={[styles.anonSubtitle, { color: textMuted }]}>
            Create an account to submit reports, earn Civic Points, and climb the leaderboard.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.push('/auth/login')}>
            <Ionicons name="person-add-outline" size={18} color="white" />
            <Text style={styles.primaryBtnText}>Create Account</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, { borderColor: border }]}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={[styles.secondaryBtnText, { color: textPrimary }]}>Sign In</Text>
          </Pressable>
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
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.headerSection, { paddingTop: insets.top + 16 }]}>
        <View style={styles.avatarRow}>
          {user.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: '#10b981' }]}>
              <Text style={styles.avatarInitial}>
                {(userDoc?.displayName ?? user.displayName ?? 'C').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={[styles.displayName, { color: textPrimary }]}>
              {userDoc?.displayName ?? user.displayName ?? 'Citizen'}
            </Text>
            <Text style={[styles.emailText, { color: textMuted }]}>{user.email}</Text>
          </View>
          <Pressable onPress={handleSignOut} disabled={signingOut} style={styles.signOutBtn}>
            {signingOut
              ? <ActivityIndicator size="small" color={textMuted} />
              : <Ionicons name="log-out-outline" size={22} color={textMuted} />
            }
          </Pressable>
        </View>
      </View>

      {/* Tier + Points Card */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.tierRow}>
          <Text style={styles.tierEmoji}>{TIER_ICONS[tier]}</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.tierName, { color: TIER_COLORS[tier] }]}>{tier}</Text>
            <Text style={[styles.pointsText, { color: textMuted }]}>{points} Civic Points</Text>
          </View>
        </View>

        {/* Progress Bar */}
        {nextTier && (
          <View style={styles.progressSection}>
            <View style={[styles.progressTrack, { backgroundColor: border }]}>
              <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: TIER_COLORS[tier] }]} />
            </View>
            <Text style={[styles.progressLabel, { color: textMuted }]}>
              {nextMin! - points} pts to {nextTier} {TIER_ICONS[nextTier]}
            </Text>
          </View>
        )}
        {!nextTier && (
          <Text style={[styles.maxTierText, { color: TIER_COLORS.Guardian }]}>
            ✨ You&apos;ve reached the highest tier!
          </Text>
        )}
      </View>

      {/* Daily Trivia */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
        <Text style={[styles.sectionLabel, { color: textMuted }]}>🧠 DAILY CIVIC TRIVIA</Text>
        {!trivia ? (
          <Text style={[styles.noTriviaText, { color: textMuted }]}>No trivia available today. Check back tomorrow!</Text>
        ) : triviaAnswered && triviaSelected === null ? (
          <Text style={[styles.noTriviaText, { color: textMuted }]}>✅ You&apos;ve already answered today&apos;s question!</Text>
        ) : (
          <>
            <Text style={[styles.triviaQuestion, { color: textPrimary }]}>{trivia.question}</Text>
            {trivia.options.map((opt, idx) => {
              let optBg = 'transparent';
              let optBorder = border;
              let optTextColor = textPrimary;

              if (triviaAnswered) {
                if (idx === trivia.correctIndex) { optBg = '#ecfdf5'; optBorder = '#10b981'; optTextColor = '#10b981'; }
                else if (idx === triviaSelected) { optBg = '#fff1f2'; optBorder = '#f43f5e'; optTextColor = '#f43f5e'; }
              }

              return (
                <Pressable
                  key={idx}
                  onPress={() => handleTriviaAnswer(idx)}
                  disabled={triviaAnswered}
                  style={[styles.triviaOption, { backgroundColor: optBg, borderColor: optBorder }]}
                >
                  <Text style={[styles.triviaOptionText, { color: optTextColor }]}>{opt}</Text>
                </Pressable>
              );
            })}
            {!triviaAnswered && (
              <Text style={[styles.triviaHint, { color: textMuted }]}>+5 Civic Points for the correct answer!</Text>
            )}
          </>
        )}
      </View>

      {/* My Reports */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
        <Text style={[styles.sectionLabel, { color: textMuted }]}>📋 MY REPORTS ({myReports.length})</Text>
        {loadingReports ? (
          <ActivityIndicator color="#10b981" />
        ) : myReports.length === 0 ? (
          <Text style={[styles.noTriviaText, { color: textMuted }]}>You haven&apos;t submitted any reports yet.</Text>
        ) : (
          myReports.map((report) => (
            <View key={report.reportId} style={[styles.reportRow, { borderColor: border }]}>
              <View style={[styles.reportVibeDot, { backgroundColor: report.vibe === 'win' ? '#10b981' : '#f43f5e' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.reportCategory, { color: textPrimary }]}>
                  {report.category.charAt(0).toUpperCase() + report.category.slice(1)} {report.vibe === 'win' ? 'Win' : 'Issue'}
                </Text>
                <Text style={[styles.reportDate, { color: textMuted }]}>
                  {report.createdAt.toDate().toLocaleDateString()}
                </Text>
              </View>
              <View style={[styles.statusBadge, {
                backgroundColor:
                  report.status === 'verified' ? '#ecfdf5' :
                  report.status === 'archived' ? '#fff1f2' : '#fef9c3'
              }]}>
                <Text style={{
                  fontSize: 11, fontWeight: '700',
                  color:
                    report.status === 'verified' ? '#10b981' :
                    report.status === 'archived' ? '#f43f5e' : '#ca8a04'
                }}>
                  {report.status.toUpperCase()}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Anonymous
  anonContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  anonEmoji: { fontSize: 64, marginBottom: 16 },
  anonTitle: { fontSize: 26, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  anonSubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  primaryBtn: {
    backgroundColor: '#10b981', borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 32, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, marginBottom: 12, width: '100%',
  },
  primaryBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    borderWidth: 1.5, borderRadius: 14, paddingVertical: 14,
    width: '100%', alignItems: 'center',
  },
  secondaryBtnText: { fontWeight: '700', fontSize: 16 },
  // Header
  headerSection: { paddingHorizontal: 16, paddingBottom: 12 },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: 'white', fontSize: 22, fontWeight: '800' },
  displayName: { fontSize: 18, fontWeight: '700' },
  emailText: { fontSize: 13, marginTop: 2 },
  signOutBtn: { padding: 8 },
  // Card
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  // Tier
  tierRow: { flexDirection: 'row', alignItems: 'center' },
  tierEmoji: { fontSize: 36 },
  tierName: { fontSize: 20, fontWeight: '800' },
  pointsText: { fontSize: 13, marginTop: 2 },
  progressSection: { marginTop: 14 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: 12, marginTop: 6 },
  maxTierText: { marginTop: 10, fontWeight: '700', fontSize: 14 },
  // Trivia
  triviaQuestion: { fontSize: 15, fontWeight: '600', lineHeight: 22, marginBottom: 14 },
  triviaOption: {
    borderWidth: 1.5, borderRadius: 10, padding: 12, marginBottom: 8,
  },
  triviaOptionText: { fontSize: 14, fontWeight: '500' },
  triviaHint: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  noTriviaText: { fontSize: 14 },
  // My Reports
  reportRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, gap: 10,
  },
  reportVibeDot: { width: 10, height: 10, borderRadius: 5 },
  reportCategory: { fontSize: 14, fontWeight: '600' },
  reportDate: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
});
