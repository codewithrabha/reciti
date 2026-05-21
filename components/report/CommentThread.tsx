import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Comment, Report } from '@/types';
import { subscribeToComments } from '@/lib/db';
import { Card } from '@/components/ui/Card';
import { StateView } from '@/components/ui/StateView';
import { useTheme } from '@/theme';

import { CommentComposer } from './CommentComposer';
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

  const someoneIsHelpful = (comments ?? []).some((c) => c.helpful === true);

  return (
    <View>
      <Card padding="lg">
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
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : comments.length === 0 ? (
          <StateView
            icon="chatbubbles-outline"
            title="Start the conversation"
            message="Share what you’ve seen on the ground, or rally neighbours to act."
            compact
          />
        ) : (
          <View>
            {comments.map((c, i) => (
              <View
                key={c.commentId}
                style={
                  i > 0
                    ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }
                    : undefined
                }
              >
                <CommentItem
                  comment={c}
                  report={report}
                  someoneIsHelpful={someoneIsHelpful}
                />
              </View>
            ))}
          </View>
        )}
      </Card>
      <View style={styles.composerSpacer}>
        <CommentComposer report={report} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  composerSpacer: {
    marginTop: 12,
  },
});
