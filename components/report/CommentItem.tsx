import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

import { Comment, Report } from '@/types';
import {
  deleteOwnComment,
  flagComment,
  markCommentHelpful,
} from '@/lib/db';
import { useUser } from '@/hooks/useAuth';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Badge } from '@/components/ui/Badge';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

interface Props {
  comment: Comment;
  report: Report;
  someoneIsHelpful: boolean;
}

export function CommentItem({ comment, report, someoneIsHelpful }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const user = useUser();
  const [actionLoading, setActionLoading] = useState(false);

  const isAuthor = !!user && user.uid === comment.authorId;
  const isReporter =
    !!user && !user.isAnonymous && user.uid === report.reporterId;
  const isArchived = report.status === 'archived';
  const isHidden = !!comment.hiddenAt;
  const isDeleted = !!comment.deletedAt;
  const alreadyFlagged = !!user && (comment.flaggedBy ?? []).includes(user.uid);

  const runLocalAction = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    try {
      await fn();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      Alert.alert('Action failed', message);
    } finally {
      setActionLoading(false);
    }
  };

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

  const handleFlag = () => {
    if (!user || !comment) return;
    if (user.isAnonymous) {
      promptSignIn();
      return;
    }
    runLocalAction(() => flagComment(report.reportId, comment.commentId, user.uid));
  };

  const handleDelete = () => {
    if (!user) return;
    Alert.alert('Delete comment?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          runLocalAction(() =>
            deleteOwnComment(report.reportId, comment.commentId, user.uid),
          ),
      },
    ]);
  };

  const handleMarkHelpful = () => {
    if (!user) return;
    runLocalAction(() =>
      markCommentHelpful(report.reportId, comment.commentId, user.uid),
    );
  };

  if (isDeleted) {
    return (
      <View style={styles.placeholder}>
        <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
        <Typography variant="caption" color={colors.textMuted}>
          Comment removed by author
        </Typography>
      </View>
    );
  }

  if (isHidden) {
    return (
      <View style={styles.placeholder}>
        <Ionicons name="eye-off-outline" size={16} color={colors.textMuted} />
        <Typography variant="caption" color={colors.textMuted}>
          Hidden by the community
        </Typography>
      </View>
    );
  }

  const initial = (comment.authorName?.[0] ?? '?').toUpperCase();
  const canShowFlag = !isAuthor && !isArchived;
  const canShowDelete = isAuthor && !isArchived;
  const canShowHelpful =
    isReporter &&
    !isAuthor &&
    !isArchived &&
    !someoneIsHelpful &&
    !comment.helpful;
  const hasAnyAction = canShowFlag || canShowDelete || canShowHelpful;

  return (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: colors.primaryMuted }]}>
        <Typography variant="body" weight="bold" color={colors.primary}>
          {initial}
        </Typography>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <Typography variant="body" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
            {comment.authorName || 'Citizen'}
          </Typography>
          <Typography variant="caption" color={colors.textMuted}>
            {formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true })}
          </Typography>
        </View>
        <Typography variant="body" style={styles.body}>
          {comment.text}
        </Typography>
        {comment.helpful ? (
          <Badge label="MARKED HELPFUL" variant="primary" size="sm" style={styles.badge} />
        ) : null}
        {hasAnyAction ? (
          <View style={styles.actions}>
            {canShowFlag ? (
              <AnimatedButton
                onPress={handleFlag}
                disabled={alreadyFlagged || actionLoading}
                hapticFeedback={alreadyFlagged ? 'none' : 'medium'}
                style={styles.actionBtn}
              >
                <Ionicons
                  name={alreadyFlagged ? 'flag' : 'flag-outline'}
                  size={14}
                  color={alreadyFlagged ? colors.danger : colors.textMuted}
                />
                <Typography
                  variant="caption"
                  color={alreadyFlagged ? colors.danger : colors.textMuted}
                >
                  {alreadyFlagged ? 'Flagged' : 'Flag'}
                </Typography>
              </AnimatedButton>
            ) : null}
            {canShowDelete ? (
              <AnimatedButton
                onPress={handleDelete}
                disabled={actionLoading}
                hapticFeedback="medium"
                style={styles.actionBtn}
              >
                <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                <Typography variant="caption" color={colors.textMuted}>
                  Delete
                </Typography>
              </AnimatedButton>
            ) : null}
            {canShowHelpful ? (
              <AnimatedButton
                onPress={handleMarkHelpful}
                disabled={actionLoading}
                hapticFeedback="success"
                style={styles.actionBtn}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="ribbon-outline" size={14} color={colors.primary} />
                )}
                <Typography variant="caption" weight="bold" color={colors.primary}>
                  Mark helpful
                </Typography>
              </AnimatedButton>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  body: {
    marginTop: 4,
    lineHeight: 20,
  },
  badge: {
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  placeholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
});
