import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { Card } from '@/components/ui/Card';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { StarRating } from './StarRating';
import { RatingBreakdown } from '@/lib/reviewService';

interface RatingSummaryCardProps {
  breakdown: RatingBreakdown;
  hasUserReviewed: boolean;
  onPressWriteReview: () => void;
}

export function RatingSummaryCard({
  breakdown,
  hasUserReviewed,
  onPressWriteReview,
}: RatingSummaryCardProps) {
  const { colors, radii, spacing } = useTheme();

  return (
    <Card padding="md" style={styles.card}>
      <View style={styles.topRow}>
        {/* Left: Score & Stars */}
        <View style={styles.scoreCol}>
          <Typography variant="h1" weight="bold" color={colors.text} style={styles.bigScore}>
            {breakdown.count > 0 ? breakdown.average.toFixed(1) : '—'}
          </Typography>
          <StarRating rating={breakdown.average} size={16} color="#F59E0B" />
          <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 4 }}>
            {breakdown.count === 0
              ? 'No reviews yet'
              : `${breakdown.count} ${breakdown.count === 1 ? 'review' : 'reviews'}`}
          </Typography>
        </View>

        {/* Right: Distribution Bars */}
        <View style={styles.barsCol}>
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const pct = breakdown.percentages[star] || 0;
            const count = breakdown.distribution[star] || 0;
            return (
              <View key={star} style={styles.barRow}>
                <Typography variant="caption" weight="medium" color={colors.textMuted} style={styles.starLabel}>
                  {star}
                </Typography>
                <Ionicons name="star" size={10} color="#F59E0B" style={{ marginRight: 6 }} />
                <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: '#F59E0B',
                      },
                    ]}
                  />
                </View>
                <Typography variant="caption" color={colors.textMuted} style={styles.countLabel}>
                  {count}
                </Typography>
              </View>
            );
          })}
        </View>
      </View>

      {/* CTA Button */}
      <View style={[styles.ctaRow, { borderTopColor: colors.border, marginTop: spacing.md }]}>
        <AnimatedButton
          onPress={onPressWriteReview}
          hapticFeedback="light"
          style={[
            styles.ctaButton,
            {
              backgroundColor: hasUserReviewed ? colors.surface : colors.primary,
              borderColor: hasUserReviewed ? colors.border : 'transparent',
              borderWidth: hasUserReviewed ? 1 : 0,
              borderRadius: radii.md,
            },
          ]}
        >
          <Ionicons
            name={hasUserReviewed ? 'create-outline' : 'star'}
            size={16}
            color={hasUserReviewed ? colors.primary : '#FFFFFF'}
          />
          <Typography
            variant="body"
            weight="bold"
            color={hasUserReviewed ? colors.primary : '#FFFFFF'}
            style={{ marginLeft: 6 }}
          >
            {hasUserReviewed ? 'Edit Your Review' : 'Write a Review'}
          </Typography>
        </AnimatedButton>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreCol: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    paddingRight: 8,
  },
  bigScore: {
    fontSize: 38,
    lineHeight: 44,
    marginBottom: 2,
  },
  barsCol: {
    flex: 1,
    gap: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starLabel: {
    width: 10,
    fontSize: 11,
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  countLabel: {
    width: 26,
    fontSize: 11,
    textAlign: 'right',
    marginLeft: 6,
  },
  ctaRow: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
  },
});
