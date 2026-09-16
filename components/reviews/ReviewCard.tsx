import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Review } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { StarRating } from './StarRating';
import { toggleHelpfulReview } from '@/lib/reviewService';

interface ReviewCardProps {
  review: Review;
  currentUserId?: string | null;
  onEdit?: (review: Review) => void;
  onDelete?: (review: Review) => void;
}

export function ReviewCard({
  review,
  currentUserId,
  onEdit,
  onDelete,
}: ReviewCardProps) {
  const { colors, radii, spacing } = useTheme();
  const isAuthor = Boolean(currentUserId && currentUserId === review.userId);
  const isLiked = Boolean(currentUserId && review.likes?.includes(currentUserId));
  const [localLiked, setLocalLiked] = useState(isLiked);
  const [localLikeCount, setLocalLikeCount] = useState(review.likes?.length || 0);

  const formattedDate = (() => {
    try {
      if (typeof review.createdAt === 'object' && review.createdAt && 'toDate' in review.createdAt) {
        return formatDistanceToNow((review.createdAt as any).toDate(), { addSuffix: true });
      }
      if (review.createdAt) {
        return formatDistanceToNow(new Date(review.createdAt as string), { addSuffix: true });
      }
    } catch {
      // Fallback
    }
    return 'Recently';
  })();

  const handleToggleHelpful = async () => {
    if (!currentUserId) {
      Alert.alert('Sign in required', 'Please sign in to mark reviews helpful.');
      return;
    }

    const nextLiked = !localLiked;
    setLocalLiked(nextLiked);
    setLocalLikeCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

    try {
      await toggleHelpfulReview(review.reviewId, currentUserId, localLiked);
    } catch {
      // Revert on error
      setLocalLiked(localLiked);
      setLocalLikeCount(review.likes?.length || 0);
    }
  };

  const handleMenuPress = () => {
    Alert.alert('Your Review', 'What would you like to do with this review?', [
      {
        text: 'Edit Review',
        onPress: () => onEdit?.(review),
      },
      {
        text: 'Delete Review',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Delete Review',
            'Are you sure you want to delete your review? This cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => onDelete?.(review),
              },
            ]
          );
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.authorGroup}>
          <View style={[styles.avatarWrap, { backgroundColor: colors.border }]}>
            {review.userPhotoURL ? (
              <Image source={{ uri: review.userPhotoURL }} style={styles.avatar} contentFit="cover" />
            ) : (
              <Ionicons name="person" size={16} color={colors.textMuted} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Typography variant="body" weight="bold" numberOfLines={1}>
                {review.userName || 'Citizen'}
              </Typography>
              {isAuthor && (
                <Badge label="YOU" variant="primary" style={{ marginLeft: 6 }} />
              )}
            </View>
            <Typography variant="caption" color={colors.textMuted}>
              {formattedDate}
              {review.updatedAt ? ' · edited' : ''}
            </Typography>
          </View>
        </View>

        {isAuthor && (
          <AnimatedButton
            onPress={handleMenuPress}
            hapticFeedback="light"
            style={styles.menuButton}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
          </AnimatedButton>
        )}
      </View>

      {/* Star Rating & Title */}
      <View style={styles.ratingRow}>
        <StarRating rating={review.rating} size={14} color="#F59E0B" />
        {review.title ? (
          <Typography variant="body" weight="bold" style={{ marginLeft: 8, flex: 1 }}>
            {review.title}
          </Typography>
        ) : null}
      </View>

      {/* Tags (if any) */}
      {review.tags && review.tags.length > 0 && (
        <View style={styles.tagWrap}>
          {review.tags.map((tag) => (
            <View
              key={tag}
              style={[
                styles.tagChip,
                { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
              ]}
            >
              <Typography variant="caption" weight="medium" color={colors.primary} style={{ fontSize: 11 }}>
                {tag}
              </Typography>
            </View>
          ))}
        </View>
      )}

      {/* Review Comment */}
      {review.comment ? (
        <Typography variant="body" color={colors.text} style={styles.commentText}>
          {review.comment}
        </Typography>
      ) : null}

      {/* Footer / Helpful Action */}
      <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
        <AnimatedButton
          onPress={handleToggleHelpful}
          hapticFeedback="light"
          style={[
            styles.helpfulBtn,
            {
              backgroundColor: localLiked ? colors.primaryMuted : 'transparent',
              borderColor: localLiked ? colors.primary : colors.border,
            },
          ]}
        >
          <Ionicons
            name={localLiked ? 'thumbs-up' : 'thumbs-up-outline'}
            size={13}
            color={localLiked ? colors.primary : colors.textMuted}
          />
          <Typography
            variant="caption"
            weight={localLiked ? 'bold' : 'regular'}
            color={localLiked ? colors.primary : colors.textMuted}
            style={{ marginLeft: 4 }}
          >
            Helpful{localLikeCount > 0 ? ` (${localLikeCount})` : ''}
          </Typography>
        </AnimatedButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  commentText: {
    marginTop: 8,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  helpfulBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
});
