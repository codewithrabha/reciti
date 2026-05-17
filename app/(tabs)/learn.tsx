import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { TriviaQuestion } from '@/types';
import { getTodayTrivia, getTriviaArchive, submitTriviaAnswer } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { TriviaCard } from '@/components/learn/TriviaCard';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { StateView } from '@/components/ui/StateView';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function formatActiveDate(activeDate: string): string {
  try {
    return format(new Date(`${activeDate}T00:00:00`), 'd MMM yyyy');
  } catch {
    return activeDate;
  }
}

export default function LearnScreen() {
  const insets = useSafeAreaInsets();
  const { user, userDoc, refreshUserDoc } = useAuth();
  const { colors, spacing, radii } = useTheme();

  const [today, setToday] = useState<TriviaQuestion | null | undefined>(undefined);
  const [todayError, setTodayError] = useState(false);
  const [archive, setArchive] = useState<TriviaQuestion[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(true);
  const [archiveError, setArchiveError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setToday(undefined);
    setTodayError(false);
    getTodayTrivia()
      .then(setToday)
      .catch(() => setTodayError(true));

    setArchiveLoading(true);
    setArchiveError(false);
    getTriviaArchive()
      .then(setArchive)
      .catch(() => setArchiveError(true))
      .finally(() => setArchiveLoading(false));
  }, [retryKey]);

  const retry = () => setRetryKey((k) => k + 1);

  const handleAnswer = useCallback(
    async (isCorrect: boolean) => {
      if (!user || !today) return;
      await submitTriviaAnswer(user.uid, today.id, isCorrect);
      await refreshUserDoc();
    },
    [user, today, refreshUserDoc],
  );

  const answeredCount = userDoc?.completedDailyTrivia?.length ?? 0;
  const alreadyCompleted =
    !!today && !!userDoc && (userDoc.completedDailyTrivia ?? []).includes(today.id);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Typography variant="h1">Learn</Typography>
        <Typography variant="body" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
          Sharpen your civic knowledge, one question a day.
        </Typography>

        {userDoc && (
          <View style={[styles.statPill, { backgroundColor: colors.primaryMuted, borderRadius: radii.full }]}>
            <Ionicons name="school" size={14} color={colors.primary} />
            <Typography variant="caption" weight="bold" color={colors.primary}>
              {answeredCount} question{answeredCount === 1 ? '' : 's'} answered
            </Typography>
          </View>
        )}

        {/* Today's trivia */}
        <Typography
          variant="caption"
          weight="bold"
          color={colors.textMuted}
          style={styles.sectionLabel}
        >
          TODAY&apos;S TRIVIA
        </Typography>

        {todayError ? (
          <Card padding="none">
            <StateView
              compact
              icon="cloud-offline"
              tone="error"
              title="Couldn’t load today’s trivia"
              message="Check your connection and try again."
              actionLabel="Retry"
              onAction={retry}
            />
          </Card>
        ) : today === undefined ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : today === null ? (
          <Card padding="none">
            <StateView
              compact
              icon="bulb-outline"
              title="No trivia today"
              message="Check back tomorrow for a fresh civic question."
            />
          </Card>
        ) : (
          <TriviaCard
            trivia={today}
            alreadyCompleted={alreadyCompleted}
            isAnonymous={!!user?.isAnonymous}
            onAnswer={handleAnswer}
          />
        )}

        {/* Knowledge archive */}
        <Typography
          variant="caption"
          weight="bold"
          color={colors.textMuted}
          style={styles.sectionLabel}
        >
          KNOWLEDGE ARCHIVE
        </Typography>

        {archiveError ? (
          <Card padding="none">
            <StateView
              compact
              icon="cloud-offline"
              tone="error"
              title="Couldn’t load the archive"
              message="Check your connection and try again."
              actionLabel="Retry"
              onAction={retry}
            />
          </Card>
        ) : archiveLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : archive.length === 0 ? (
          <Card padding="none">
            <StateView
              compact
              icon="library-outline"
              title="Archive is empty"
              message="Past questions will appear here as new trivia is added each day."
            />
          </Card>
        ) : (
          archive.map((item) => (
            <Card key={item.id} padding="md" style={styles.archiveCard}>
              <View style={styles.archiveMeta}>
                <Badge label={cap(item.category)} variant="default" />
                <Typography variant="caption" color={colors.textMuted}>
                  {formatActiveDate(item.activeDate)}
                </Typography>
              </View>
              <Typography variant="body" weight="semiBold" style={{ marginTop: spacing.sm }}>
                {item.question}
              </Typography>
              <View style={styles.answerRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Typography variant="caption" weight="semiBold" color={colors.primary} style={styles.answerText}>
                  {item.options[item.correctIndex]}
                </Typography>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
  },
  sectionLabel: { letterSpacing: 1, marginTop: 24, marginBottom: 10 },
  loading: { paddingVertical: 40, alignItems: 'center' },
  archiveCard: { marginBottom: 12 },
  archiveMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  answerText: { flex: 1 },
});
