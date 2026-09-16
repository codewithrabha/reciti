import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Review, ReviewTargetType } from '@/types';
import { useUser } from '@/store/authStore';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { Card } from '@/components/ui/Card';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { RatingSummaryCard } from './RatingSummaryCard';
import { ReviewCard } from './ReviewCard';
import { ReviewComposerModal } from './ReviewComposerModal';
import {
  calculateRatingBreakdown,
  deleteReview,
  subscribeReviewsForTarget,
} from '@/lib/reviewService';

interface ReviewsSectionProps {
  targetId: string;
  targetType: ReviewTargetType;
  targetTitle: string;
  initialRating?: number;
  initialReviewCount?: number;
  onRatingUpdated?: (newRating: number, newCount: number) => void;
}

export function ReviewsSection({
  targetId,
  targetType,
  targetTitle,
  initialRating,
  initialReviewCount,
  onRatingUpdated,
}: ReviewsSectionProps) {
  const { colors, spacing, radii } = useTheme();
  const user = useUser();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | number>('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  useEffect(() => {
    if (!targetId) return;

    setLoading(true);
    const unsubscribe = subscribeReviewsForTarget(
      targetId,
      (items) => {
        setReviews(items);
        setLoading(false);

        if (onRatingUpdated) {
          const breakdown = calculateRatingBreakdown(items);
          onRatingUpdated(breakdown.average, breakdown.count);
        }
      },
      (err) => {
        console.warn('[ReviewsSection] subscription error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [targetId]);

  const userReview = user ? reviews.find((r) => r.userId === user.uid) : null;
  const breakdown = calculateRatingBreakdown(reviews);

  const handleOpenComposer = (reviewToEdit?: Review) => {
    if (!user) {
      Alert.alert(
        'Sign in required',
        'Please sign in or create an account to leave a review.'
      );
      return;
    }
    setEditingReview(reviewToEdit || userReview || null);
    setComposerOpen(true);
  };

  const handleDeleteReview = async (review: Review) => {
    if (!user) return;
    try {
      const res = await deleteReview(targetId, targetType, user.uid);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        Alert.alert('Error', res.error || 'Failed to delete review');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to delete review');
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (selectedFilter === 'all') return true;
    return Math.round(r.rating) === selectedFilter;
  });

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionLabel}>
          COMMUNITY RATINGS & REVIEWS
        </Typography>
        {reviews.length > 0 && (
          <Typography variant="caption" color={colors.textMuted}>
            {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </Typography>
        )}
      </View>

      {/* Summary Score & Distribution Card */}
      <RatingSummaryCard
        breakdown={breakdown}
        hasUserReviewed={Boolean(userReview)}
        onPressWriteReview={() => handleOpenComposer()}
      />

      {/* Filter Chips (only when multiple reviews exist) */}
      {reviews.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <Pressable
            onPress={() => setSelectedFilter('all')}
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedFilter === 'all' ? colors.primary : colors.surface,
                borderColor: selectedFilter === 'all' ? colors.primary : colors.border,
              },
            ]}
          >
            <Typography
              variant="caption"
              weight={selectedFilter === 'all' ? 'bold' : 'medium'}
              color={selectedFilter === 'all' ? '#FFFFFF' : colors.text}
            >
              All ({reviews.length})
            </Typography>
          </Pressable>

          {([5, 4, 3, 2, 1] as const).map((star) => {
            const count = breakdown.distribution[star] || 0;
            if (count === 0) return null;
            const isSelected = selectedFilter === star;
            return (
              <Pressable
                key={star}
                onPress={() => setSelectedFilter(isSelected ? 'all' : star)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="star"
                  size={11}
                  color={isSelected ? '#FFFFFF' : '#F59E0B'}
                  style={{ marginRight: 3 }}
                />
                <Typography
                  variant="caption"
                  weight={isSelected ? 'bold' : 'medium'}
                  color={isSelected ? '#FFFFFF' : colors.text}
                >
                  {star}★ ({count})
                </Typography>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Reviews List */}
      <View style={styles.listContainer}>
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : filteredReviews.length > 0 ? (
          filteredReviews.map((item) => (
            <ReviewCard
              key={item.reviewId}
              review={item}
              currentUserId={user?.uid ?? null}
              onEdit={(rev) => handleOpenComposer(rev)}
              onDelete={handleDeleteReview}
            />
          ))
        ) : reviews.length > 0 ? (
          <Card padding="md" style={styles.emptyFilterCard}>
            <Ionicons name="filter-outline" size={24} color={colors.textMuted} />
            <Typography variant="body" color={colors.textMuted} style={{ marginTop: 6 }}>
              No {selectedFilter}★ reviews found.
            </Typography>
          </Card>
        ) : (
          <Card padding="lg" style={styles.emptyCard}>
            <Ionicons name="chatbox-ellipses-outline" size={32} color={colors.textMuted} />
            <Typography variant="body" weight="bold" color={colors.text} style={{ marginTop: 8 }}>
              No reviews yet
            </Typography>
            <Typography variant="caption" color={colors.textMuted} align="center" style={{ marginTop: 4 }}>
              Have you visited {targetTitle}? Share your rating and honest feedback to help fellow citizens.
            </Typography>
            <AnimatedButton
              onPress={() => handleOpenComposer()}
              hapticFeedback="light"
              style={[
                styles.emptyActionBtn,
                { backgroundColor: colors.primaryMuted, borderRadius: radii.md },
              ]}
            >
              <Ionicons name="star" size={15} color={colors.primary} />
              <Typography variant="body" weight="bold" color={colors.primary} style={{ marginLeft: 6 }}>
                Be the first to review
              </Typography>
            </AnimatedButton>
          </Card>
        )}
      </View>

      {/* Review Composer Modal */}
      <ReviewComposerModal
        visible={composerOpen}
        targetId={targetId}
        targetType={targetType}
        targetTitle={targetTitle}
        existingReview={editingReview}
        onClose={() => {
          setComposerOpen(false);
          setEditingReview(null);
        }}
        onSuccess={() => {
          // Handled via real-time subscription
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionLabel: {
    letterSpacing: 0.8,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  listContainer: {
    marginTop: 4,
  },
  centerLoading: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFilterCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 14,
  },
});
