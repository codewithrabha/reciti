import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Review, ReviewTargetType } from '@/types';
import { useUser, useUserDoc } from '@/store/authStore';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { StarRating } from './StarRating';
import { deleteReview, submitReview } from '@/lib/reviewService';

interface ReviewComposerModalProps {
  visible: boolean;
  targetId: string;
  targetType: ReviewTargetType;
  targetTitle: string;
  existingReview?: Review | null;
  onClose: () => void;
  onSuccess: () => void;
}

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: 'Poor — Needs improvement',
  2: 'Fair — Okay experience',
  3: 'Good — Met expectations',
  4: 'Very Good — Highly recommended',
  5: 'Exceptional — Absolutely loved it!',
};

export function ReviewComposerModal({
  visible,
  targetId,
  targetType,
  targetTitle,
  existingReview,
  onClose,
  onSuccess,
}: ReviewComposerModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, radii, spacing } = useTheme();
  const user = useUser();
  const userDoc = useUserDoc();

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{
    isNew: boolean;
    karmaEarned: number;
  } | null>(null);

  const isEditing = Boolean(existingReview);

  useEffect(() => {
    if (visible) {
      setSubmittedResult(null);
      if (existingReview) {
        setRating(existingReview.rating || 5);
        setTitle(existingReview.title || '');
        setComment(existingReview.comment || '');
      } else {
        setRating(5);
        setTitle('');
        setComment('');
      }
    }
  }, [visible, existingReview]);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'You must be signed in to submit a review.');
      return;
    }

    if (!comment.trim()) {
      Alert.alert('Review Required', 'Please share a few words about your experience.');
      return;
    }

    setSubmitting(true);
    try {
      const displayName =
        userDoc?.displayName ||
        user.displayName ||
        user.email?.split('@')[0] ||
        'Verified Citizen';

      const result = await submitReview({
        targetId,
        targetType,
        targetTitle,
        userId: user.uid,
        userName: displayName,
        userPhotoURL: user.photoURL || userDoc?.photoURL || null,
        rating,
        title,
        comment,
        tags: existingReview?.tags ?? [],
      });

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onSuccess();
        setSubmittedResult({
          isNew: Boolean(result.isNew),
          karmaEarned: result.karmaEarned ?? 0,
        });
      } else {
        Alert.alert('Error', result.error || 'Could not save review. Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    setSubmittedResult(null);
    onClose();
  };

  const handleDelete = () => {
    if (!user || !existingReview) return;

    Alert.alert('Delete Review', 'Are you sure you want to delete this review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSubmitting(true);
          try {
            const res = await deleteReview(targetId, targetType, user.uid);
            if (res.success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              onSuccess();
              onClose();
            } else {
              Alert.alert('Error', res.error || 'Failed to delete review');
            }
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete review');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={submittedResult ? handleDone : onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={submittedResult ? handleDone : onClose}
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              paddingBottom: Math.max(insets.bottom, 16) + 16,
            },
          ]}
        >
          {/* Handle bar */}
          <View style={[styles.handleBar, { backgroundColor: colors.border }]} />

          {submittedResult ? (
            /* ─── Thank You & Karma Celebration Screen ───────────────────────── */
            <View style={styles.thankYouContainer}>
              <View
                style={[
                  styles.celebrationIconRing,
                  {
                    backgroundColor: colors.primaryMuted,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Ionicons
                  name={submittedResult.karmaEarned > 0 ? 'sparkles' : 'checkmark'}
                  size={36}
                  color={colors.primary}
                />
              </View>

              <Typography variant="h1" align="center" style={{ marginTop: 14 }}>
                {submittedResult.isNew ? 'Thank You for Your Feedback!' : 'Review Updated!'}
              </Typography>

              <Typography
                variant="body"
                color={colors.textMuted}
                align="center"
                style={styles.thankYouSub}
              >
                Your feedback for{' '}
                <Typography variant="body" weight="bold" color={colors.text}>
                  {targetTitle}
                </Typography>{' '}
                helps fellow citizens make informed decisions and builds a transparent community.
              </Typography>

              {/* Rating recap badge */}
              <View
                style={[
                  styles.recapRow,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <StarRating rating={rating} size={18} color="#F59E0B" />
                <Typography
                  variant="caption"
                  weight="bold"
                  color={colors.primary}
                  style={{ marginLeft: 8 }}
                >
                  {RATING_DESCRIPTIONS[rating]}
                </Typography>
              </View>

              {/* Civic Karma Reward Card */}
              {submittedResult.karmaEarned > 0 ? (
                <View
                  style={[
                    styles.karmaCard,
                    {
                      backgroundColor: colors.primaryMuted,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <View style={styles.karmaRow}>
                    <View
                      style={[
                        styles.karmaIconBadge,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Ionicons name="trophy" size={20} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Typography variant="body" weight="bold" color={colors.primary}>
                        +{submittedResult.karmaEarned} Civic Karma Earned!
                      </Typography>
                      <Typography variant="caption" color={colors.text} style={{ marginTop: 2 }}>
                        Your contribution has been credited to your civic profile and leaderboard standing.
                      </Typography>
                    </View>
                  </View>
                </View>
              ) : (
                <View
                  style={[
                    styles.karmaCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.karmaRow}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Typography variant="body" weight="bold" color={colors.text}>
                        Changes Saved
                      </Typography>
                      <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                        Your updated ratings and comments are live in the community view.
                      </Typography>
                    </View>
                  </View>
                </View>
              )}

              {/* Done Button */}
              <AnimatedButton
                onPress={handleDone}
                hapticFeedback="medium"
                style={[
                  styles.doneBtn,
                  { backgroundColor: colors.primary, borderRadius: radii.md },
                ]}
              >
                <Typography variant="body" weight="bold" color="#FFFFFF">
                  Done
                </Typography>
              </AnimatedButton>
            </View>
          ) : (
            /* ─── Review Input Form ────────────────────────────────────────── */
            <>
              {/* Sheet Header */}
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Typography variant="h2">
                    {isEditing ? 'Edit Your Review' : 'Rate & Review'}
                  </Typography>
                  <Typography variant="caption" color={colors.textMuted} numberOfLines={1}>
                    {targetTitle}
                  </Typography>
                </View>
                <AnimatedButton onPress={onClose} hapticFeedback="light" style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </AnimatedButton>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 20 }}
              >
                {/* Interactive Stars */}
                <View style={styles.starSection}>
                  <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.fieldLabel}>
                    YOUR OVERALL RATING
                  </Typography>
                  <StarRating
                    rating={rating}
                    size={34}
                    interactive
                    onRate={(val) => setRating(val)}
                    style={styles.starRow}
                  />
                  <Typography
                    variant="body"
                    weight="bold"
                    color={colors.primary}
                    style={styles.ratingDesc}
                  >
                    {RATING_DESCRIPTIONS[rating]}
                  </Typography>
                </View>

                {/* Review Title Input */}
                <View style={styles.inputGroup}>
                  <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.fieldLabel}>
                    HEADLINE (OPTIONAL)
                  </Typography>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. Wonderful atmosphere and great service"
                    placeholderTextColor={colors.textMuted}
                    maxLength={80}
                    style={[
                      styles.textInput,
                      {
                        color: colors.text,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        borderRadius: radii.md,
                      },
                    ]}
                  />
                </View>

                {/* Review Comment Input */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelWithCounter}>
                    <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.fieldLabel}>
                      YOUR REVIEW
                    </Typography>
                    <Typography variant="caption" color={colors.textMuted}>
                      {comment.length}/500
                    </Typography>
                  </View>
                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    placeholder="Describe your experience, cleanliness, pricing, accessibility, or helpful tips for other citizens..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                    textAlignVertical="top"
                    style={[
                      styles.textArea,
                      {
                        color: colors.text,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        borderRadius: radii.md,
                      },
                    ]}
                  />
                </View>

                {/* Actions */}
                <View style={[styles.actionRow, { marginTop: spacing.md }]}>
                  {isEditing && (
                    <AnimatedButton
                      onPress={handleDelete}
                      disabled={submitting}
                      hapticFeedback="medium"
                      style={[
                        styles.deleteBtn,
                        { borderColor: colors.danger, borderRadius: radii.md },
                      ]}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </AnimatedButton>
                  )}

                  <AnimatedButton
                    onPress={handleSubmit}
                    disabled={submitting}
                    hapticFeedback="medium"
                    style={[
                      styles.submitBtn,
                      {
                        backgroundColor: colors.primary,
                        borderRadius: radii.md,
                        flex: 1,
                      },
                    ]}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                        <Typography variant="body" weight="bold" color="#FFFFFF" style={{ marginLeft: 6 }}>
                          {isEditing ? 'Update Review' : 'Submit Review'}
                        </Typography>
                      </>
                    )}
                  </AnimatedButton>
                </View>
              </ScrollView>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starSection: {
    alignItems: 'center',
    marginVertical: 10,
  },
  fieldLabel: {
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  starRow: {
    marginVertical: 6,
  },
  ratingDesc: {
    marginTop: 4,
  },
  inputGroup: {
    marginTop: 14,
  },
  labelWithCounter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    fontSize: 14,
  },
  textArea: {
    minHeight: 96,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  // Thank You / Celebration Screen styles
  thankYouContainer: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 6,
  },
  celebrationIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thankYouSub: {
    marginTop: 8,
    paddingHorizontal: 10,
    lineHeight: 20,
  },
  recapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
  },
  karmaCard: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 16,
  },
  karmaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  karmaIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    marginTop: 20,
    marginBottom: 10,
  },
});
