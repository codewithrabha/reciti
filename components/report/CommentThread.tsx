import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Comment, Report } from '@/types';
import { subscribeToComments } from '@/lib/db';
import { StateView } from '@/components/ui/StateView';
import { Typography } from '@/components/ui/Typography';
import { CommentSkeleton } from '@/components/skeletons';
import { useTheme } from '@/theme';

import { CommentItem } from './CommentItem';

interface Props {
  report: Report;
}

export function CommentThread({ report }: Props) {
  const { colors } = useTheme();
  const [comments, setComments] = useState<Comment[] | undefined>(undefined);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setError(false);
    const unsub = subscribeToComments(
      report.reportId,
      (next) => setComments(next),
      () => setError(true),
    );
    return unsub;
  }, [report.reportId, retryKey]);

  const helpfulComment = (comments ?? []).find((c) => c.helpful === true);
  const listComments = (comments ?? []).filter((c) => c.helpful !== true);
  const someoneIsHelpful = !!helpfulComment;

  return (
    <View style={styles.wrap}>
      <Typography
        variant="caption"
        weight="bold"
        color={colors.textMuted}
        style={styles.header}
      >
        DISCUSSION
      </Typography>

      {error ? (
        <StateView
          icon="cloud-offline"
          tone="error"
          title="Couldn’t load the discussion"
          message="Check your connection and try again."
          actionLabel="Retry"
          onAction={() => setRetryKey((k) => k + 1)}
          compact
        />
      ) : comments === undefined ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
          <CommentSkeleton count={3} />
        </Animated.View>
      ) : comments.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="chatbubbles" size={26} color={colors.primary} />
          </View>
          <Typography
            variant="subtitle"
            weight="bold"
            align="center"
            style={{ marginTop: 12 }}
          >
            Be the first to comment
          </Typography>
          <Typography
            variant="caption"
            color={colors.textMuted}
            align="center"
            style={{ marginTop: 4 }}
          >
            Share what you’ve seen on the ground, or rally neighbours to act.
          </Typography>
        </View>
      ) : (
        <View>
          {helpfulComment ? (
            <View style={{ marginBottom: 4 }}>
              <CommentItem
                comment={helpfulComment}
                report={report}
                someoneIsHelpful={someoneIsHelpful}
                featured
              />
            </View>
          ) : null}
          {listComments.map((c, i) => (
            <View key={c.commentId}>
              {i > 0 ? (
                <View style={[styles.separator, { borderTopColor: colors.border }]} />
              ) : null}
              <CommentItem
                comment={c}
                report={report}
                someoneIsHelpful={someoneIsHelpful}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 24 },
  header: { letterSpacing: 1, marginBottom: 12 },
  loading: { paddingVertical: 24, alignItems: 'center' },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
});
