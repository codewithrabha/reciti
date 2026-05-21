import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Report } from '@/types';
import { COMMENT_MAX_LENGTH, submitComment } from '@/lib/db';
import { useUser, useUserDoc } from '@/hooks/useAuth';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

interface Props {
  report: Report;
}

export function CommentComposer({ report }: Props) {
  const { colors, radii, typography } = useTheme();
  const router = useRouter();
  const user = useUser();
  const userDoc = useUserDoc();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isArchived = report.status === 'archived';
  const isAnonymous = !user || user.isAnonymous;

  if (isArchived) {
    return (
      <Card padding="md" variant="outlined" style={styles.notice}>
        <View style={styles.noticeRow}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
          <Typography variant="caption" color={colors.textMuted}>
            This thread is closed because the report was removed.
          </Typography>
        </View>
      </Card>
    );
  }

  if (isAnonymous) {
    const promptSignIn = () => {
      Alert.alert(
        'Account required',
        'Create an account to participate in the discussion.',
        [
          { text: 'Maybe later', style: 'cancel' },
          { text: 'Create account', onPress: () => router.push('/auth/login') },
        ],
      );
    };
    return (
      <AnimatedButton
        onPress={promptSignIn}
        hapticFeedback="light"
        style={[
          styles.signInBox,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.md,
          },
        ]}
      >
        <Ionicons name="chatbubbles-outline" size={18} color={colors.textMuted} />
        <Typography variant="body" color={colors.textMuted}>
          Sign in to comment
        </Typography>
      </AnimatedButton>
    );
  }

  const handleSubmit = async () => {
    if (!user) return;
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    setSubmitting(true);
    try {
      const authorName =
        userDoc?.displayName || user.displayName || 'Citizen';
      await submitComment(report.reportId, user.uid, authorName, trimmed);
      setText('');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Please try again.';
      Alert.alert('Couldn’t post', message);
    } finally {
      setSubmitting(false);
    }
  };

  const showCounter = text.length > COMMENT_MAX_LENGTH * 0.8;
  const atMax = text.length >= COMMENT_MAX_LENGTH;
  const canSubmit = !submitting && text.trim().length > 0;

  return (
    <View>
      <View style={styles.composerRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Share your thoughts…"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={COMMENT_MAX_LENGTH}
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.md,
              color: colors.text,
              fontFamily: typography.family.regular,
              fontSize: typography.size.md,
            },
          ]}
        />
        <AnimatedButton
          onPress={handleSubmit}
          disabled={!canSubmit}
          hapticFeedback={canSubmit ? 'success' : 'none'}
          style={[
            styles.sendBtn,
            { backgroundColor: colors.primary, borderRadius: radii.full },
            !canSubmit && styles.dim,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Ionicons name="send" size={18} color={colors.white} />
          )}
        </AnimatedButton>
      </View>
      {showCounter ? (
        <Typography
          variant="caption"
          color={atMax ? colors.danger : colors.textMuted}
          align="right"
          style={styles.counter}
        >
          {text.length}/{COMMENT_MAX_LENGTH}
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    alignItems: 'center',
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signInBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    borderWidth: 1,
  },
  sendBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: {
    opacity: 0.5,
  },
  counter: {
    marginTop: 6,
  },
});
