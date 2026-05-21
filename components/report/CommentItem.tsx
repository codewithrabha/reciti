import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Comment, Report } from '@/types';
import {
  deleteOwnComment,
  flagComment,
  markCommentHelpful,
} from '@/lib/db';
import { useUser } from '@/hooks/useAuth';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

interface Props {
  comment: Comment;
  report: Report;
  someoneIsHelpful: boolean;
  featured?: boolean;
}

const shortTime = (date: Date): string => {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  if (diff < 31536000) return `${Math.floor(diff / 604800)}w`;
  return `${Math.floor(diff / 31536000)}y`;
};

export function CommentItem({ comment, report, someoneIsHelpful, featured = false }: Props) {
  const { colors, radii } = useTheme();
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
  const authorIsReporter = comment.authorId === report.reporterId;

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
    if (!user) return;
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

  const inner = (
    <View style={styles.row}>
      <View
        style={[
          styles.avatar,
          { backgroundColor: featured ? colors.surface : colors.primaryMuted },
        ]}
      >
        <Typography variant="body" weight="bold" color={colors.primary}>
          {initial}
        </Typography>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Typography
              variant="body"
              weight="bold"
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {comment.authorName || 'Citizen'}
            </Typography>
            {authorIsReporter ? (
              <View
                style={[
                  styles.reporterChip,
                  { backgroundColor: colors.primaryMuted, borderRadius: radii.full },
                ]}
              >
                <Typography
                  variant="caption"
                  weight="bold"
                  color={colors.primary}
                  style={{ fontSize: 10, letterSpacing: 0.5 }}
                >
                  REPORTER
                </Typography>
              </View>
            ) : null}
          </View>
          <Typography variant="caption" color={colors.textMuted}>
            {shortTime(comment.createdAt.toDate())}
          </Typography>
        </View>
        <Typography variant="body" style={styles.body}>
          {comment.text}
        </Typography>
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

  if (featured) {
    return (
      <View
        style={[
          styles.featuredWrap,
          { backgroundColor: colors.primaryMuted, borderRadius: radii.lg },
        ]}
      >
        <View style={styles.ribbon}>
          <Ionicons name="ribbon" size={14} color={colors.primary} />
          <Typography
            variant="caption"
            weight="bold"
            color={colors.primary}
            style={{ letterSpacing: 1, fontSize: 11 }}
          >
            MARKED HELPFUL
          </Typography>
        </View>
        {inner}
      </View>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
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
    justifyContent: 'space-between',
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  reporterChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  body: {
    marginTop: 4,
    lineHeight: 20,
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
    paddingVertical: 14,
  },
  featuredWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  ribbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
