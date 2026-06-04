import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';
import { TriviaQuestion } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface TriviaCardProps {
  trivia: TriviaQuestion;
  /** True if the user answered this in an earlier session. */
  alreadyCompleted: boolean;
  isAnonymous: boolean;
  onAnswer: (isCorrect: boolean) => void | Promise<void>;
}

export function TriviaCard({
  trivia,
  alreadyCompleted,
  isAnonymous,
  onAnswer,
}: TriviaCardProps) {
  const { colors, radii, spacing } = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const revealed = selected !== null || alreadyCompleted;

  const handlePick = async (index: number) => {
    if (revealed || submitting) return;
    setSelected(index);
    setSubmitting(true);
    try {
      await onAnswer(index === trivia.correctIndex);
    } finally {
      setSubmitting(false);
    }
  };

  const optionStyle = (index: number) => {
    if (!revealed) {
      return { bg: colors.surface, border: colors.border, fg: colors.text, icon: null };
    }
    if (index === trivia.correctIndex) {
      return {
        bg: colors.primaryMuted,
        border: colors.primary,
        fg: colors.primary,
        icon: 'checkmark-circle' as const,
      };
    }
    if (index === selected) {
      return {
        bg: colors.dangerMuted,
        border: colors.danger,
        fg: colors.danger,
        icon: 'close-circle' as const,
      };
    }
    return { bg: colors.surface, border: colors.border, fg: colors.textMuted, icon: null };
  };

  const feedback = (() => {
    if (!revealed) return null;
    if (selected === null) {
      return {
        text: 'You already answered this today — come back tomorrow to try again for points.',
        color: colors.textMuted,
        bg: colors.background,
        icon: 'information-circle' as const,
      };
    }
    if (selected === trivia.correctIndex) {
      return {
        text: isAnonymous
          ? 'Correct! Sign in to earn Civic Points for trivia.'
          : 'Correct! +5 Civic Points.',
        color: colors.primary,
        bg: colors.primaryMuted,
        icon: 'checkmark-circle' as const,
      };
    }
    return {
      text: 'Not quite — the correct answer is highlighted above.',
      color: colors.danger,
      bg: colors.dangerMuted,
      icon: 'close-circle' as const,
    };
  })();

  return (
    <Card padding="md">
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryMuted }]}>
          <Ionicons name="bulb" size={18} color={colors.primary} />
        </View>
        <Typography
          variant="caption"
          weight="bold"
          color={colors.textMuted}
          style={styles.kicker}
        >
          DAILY TRIVIA
        </Typography>
        <Badge label={cap(trivia.category)} variant="primary" />
      </View>

      <Typography
        variant="h3"
        weight="medium"
        style={{ marginTop: spacing.md, marginBottom: spacing.md }}
      >
        {trivia.question}
      </Typography>

      {trivia.options.map((option, i) => {
        const s = optionStyle(i);
        return (
          <AnimatedButton
            key={i}
            onPress={() => handlePick(i)}
            disabled={revealed}
            hapticFeedback={revealed ? 'none' : 'light'}
            scaleTo={0.98}
            style={[
              styles.option,
              { backgroundColor: s.bg, borderColor: s.border, borderRadius: radii.md },
            ]}
          >
            <Typography variant="body" weight="medium" color={s.fg} style={styles.optionText}>
              {option}
            </Typography>
            {s.icon && <Ionicons name={s.icon} size={20} color={s.fg} />}
          </AnimatedButton>
        );
      })}

      {feedback && (
        <View style={[styles.feedback, { backgroundColor: feedback.bg, borderRadius: radii.md }]}>
          <Ionicons name={feedback.icon} size={18} color={feedback.color} />
          <Typography
            variant="caption"
            weight="semiBold"
            color={feedback.color}
            style={styles.feedbackText}
          >
            {feedback.text}
          </Typography>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { letterSpacing: 1, flex: 1 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  optionText: { flex: 1 },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginTop: 4,
  },
  feedbackText: { flex: 1 },
});
