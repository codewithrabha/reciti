import React from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Report } from '@/types';
import { VERIFICATION_THRESHOLD } from '@/lib/db';
import { formatDistanceToNow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './ui/Card';
import { Typography } from './ui/Typography';
import { Badge } from './ui/Badge';
import { AnimatedButton } from './ui/AnimatedButton';
import { useTheme } from '@/theme';

interface ReportCardProps {
  report: Report;
  onVerify?: () => void;
  onFlag?: () => void;
  onUpvote?: () => void;
  isUpvoted?: boolean;
  onPress?: () => void;
  isRadarView?: boolean;
}

export function ReportCard({
  report, onVerify, onFlag, onUpvote, isUpvoted = false, onPress, isRadarView = false,
}: ReportCardProps) {
  const { colors, spacing } = useTheme();
  const isWin = report.vibe === 'win';
  const isEngageable = report.status !== 'pending';

  const handleShare = async () => {
    try {
      const url = Linking.createURL(`report/${report.reportId}`);
      const headline = `${isWin ? 'Civic win' : 'Civic issue'} on ReCiti`;
      const body = report.description ? `${headline}: ${report.description}` : headline;
      await Share.share({ message: `${body}\n\n${url}`, url });
    } catch {
      // user dismissed or platform error — nothing to do
    }
  };

  const main = (
    <>
      {/* Header */}
      <View style={[styles.cardHeader, { padding: spacing.md }]}>
        
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.iconBadge, { backgroundColor: isWin ? colors.primaryMuted : colors.dangerMuted }]}>
            <Ionicons
              name={isWin ? 'leaf' : 'warning'}
              size={16}
              color={isWin ? colors.primary : colors.danger}
            />
          </View>

          <View style={{ marginLeft: spacing.sm }}>
            <Typography variant="body" weight="semiBold">
              {report.category.charAt(0).toUpperCase() + report.category.slice(1)} {isWin ? 'Win' : 'Issue'}
            </Typography>
            <View style={styles.metaRow}>
              {report.city ? (
                <>
                  <Ionicons name="location" size={11} color={colors.textMuted} />
                  <Typography variant="caption" color={colors.textMuted}>
                    {report.city}
                  </Typography>
                  <Typography variant="caption" color={colors.textMuted}>·</Typography>
                </>
              ) : null}
              <Typography variant="caption" color={colors.textMuted}>
                {formatDistanceToNow(report.createdAt.toDate(), { addSuffix: false })}
              </Typography>
            </View>
          </View>
        </View>

        <Badge
          label={isWin ? '+ Civic Win' : '- Civic Fail'}
          variant={isWin ? 'primary' : 'danger'}
        />
        
      </View>

      {/* Image */}
      {report.imageUrl ? (
        <View>
          <Image source={{ uri: report.imageUrl }} style={styles.cardImage} contentFit="cover" transition={300} />
          {report.imageUrls && report.imageUrls.length > 1 && (
            <View style={[styles.photoCountBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
              <Ionicons name="copy" size={12} color="#FFFFFF" />
              <Typography variant="caption" weight="bold" color="#FFFFFF">
                +{report.imageUrls.length - 1}
              </Typography>
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.cardImagePlaceholder, { backgroundColor: colors.background }]}>
          <Ionicons name="image-outline" size={32} color={colors.border} />
        </View>
      )}

      {/* Description preview */}
      {report.description ? (
        <View style={{ padding: spacing.md }}>
        <Typography
          variant="body"
          color={colors.text}
          style={[styles.description, { padding: spacing.sm }]}
          numberOfLines={2}
        >
          {report.description}
        </Typography>
        </View>
      ) : null}
    </>
  );

  return (
    <Card padding="none" style={styles.card}>
      {onPress ? (
        <AnimatedButton onPress={onPress} hapticFeedback="light" scaleTo={1}>
          {main}
        </AnimatedButton>
      ) : (
        main
      )}

      {/* Radar Actions */}
      {isRadarView && report.status === 'pending' && (
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          <AnimatedButton
            onPress={onVerify}
            hapticFeedback="success"
            style={[styles.actionBtn, { borderRightColor: colors.border, borderRightWidth: 1 }]}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
            <Typography variant="body" weight="semiBold" color={colors.primary} style={{ marginLeft: spacing.xs }}>
              Verify ({report.verifiedBy.length}/{VERIFICATION_THRESHOLD})
            </Typography>
          </AnimatedButton>

          <AnimatedButton
            onPress={onFlag}
            hapticFeedback="medium"
            style={styles.actionBtn}
          >
            <Ionicons name="flag-outline" size={20} color={colors.danger} />
            <Typography variant="body" weight="semiBold" color={colors.danger} style={{ marginLeft: spacing.xs }}>
              Flag
            </Typography>
          </AnimatedButton>
        </View>
      )}

      {/* Engagement footer — shown once the report has cleared verification */}
      {isEngageable && (
        <View style={[styles.actions, { borderTopWidth: 0 }]}>
          <AnimatedButton
            onPress={onUpvote}
            hapticFeedback="light"
            style={styles.actionBtn}
          >
            <Ionicons
              name={isUpvoted ? 'thumbs-up' : 'thumbs-up-outline'}
              size={22}
              color={isUpvoted ? colors.primary : colors.textMuted}
            />
            <Typography
              variant="caption"
              weight={isUpvoted ? 'bold' : 'medium'}
              color={isUpvoted ? colors.primary : colors.textMuted}
              style={{ marginLeft: spacing.xs }}
            >
              {report.upvotedBy?.length ?? 0}
            </Typography>
          </AnimatedButton>

          <AnimatedButton
            onPress={onPress}
            hapticFeedback="light"
            style={[styles.actionBtn]}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.textMuted} />
            <Typography
              variant="caption"
              weight="medium"
              color={colors.textMuted}
              style={{ marginLeft: spacing.xs }}
            >
              {report.commentCount ?? 0}
            </Typography>
          </AnimatedButton>

          <AnimatedButton
            onPress={handleShare}
            hapticFeedback="light"
            style={[styles.actionBtn]}
          >
            <Ionicons name="share-social-outline" size={20} color={colors.textMuted} />
          </AnimatedButton>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  iconBadge: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  cardImage: { width: '100%', height: 220 },
  photoCountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  description: { lineHeight: 21 },
  cardImagePlaceholder: {
    width: '100%', height: 220, alignItems: 'center', justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
