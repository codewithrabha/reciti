import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Review, ReviewTargetType } from '@/types';
import { awardPoints } from './db';

const REVIEWS_COL = collection(db, 'reviews');
export const REVIEW_KARMA_POINTS = 5;

export interface SubmitReviewParams {
  targetId: string;
  targetType: ReviewTargetType;
  targetTitle?: string;
  userId: string;
  userName: string;
  userPhotoURL?: string | null;
  rating: number;
  title?: string;
  comment: string;
  tags?: string[];
}

export interface RatingBreakdown {
  average: number;
  count: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  percentages: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

/**
 * Deterministic doc ID guaranteeing 1 review per user per target.
 */
export function getReviewDocId(targetId: string, userId: string): string {
  return `${targetId}_${userId}`;
}

/**
 * Subscribes to real-time reviews for a given directory or event.
 */
export function subscribeReviewsForTarget(
  targetId: string,
  onUpdate: (reviews: Review[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(REVIEWS_COL, where('targetId', '==', targetId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Review[] = snapshot.docs.map((d) => ({
        ...(d.data() as Review),
        reviewId: d.id,
      }));

      // Sort newest first client-side
      items.sort((a, b) => {
        const timeA =
          typeof a.createdAt === 'object' && a.createdAt && 'toMillis' in a.createdAt
            ? (a.createdAt as Timestamp).toMillis()
            : new Date(a.createdAt as string).getTime() || 0;
        const timeB =
          typeof b.createdAt === 'object' && b.createdAt && 'toMillis' in b.createdAt
            ? (b.createdAt as Timestamp).toMillis()
            : new Date(b.createdAt as string).getTime() || 0;
        return timeB - timeA;
      });

      onUpdate(items);
    },
    (err) => {
      console.warn('[reviewService] subscribeReviews error:', err);
      onError?.(err);
    }
  );
}

/**
 * Fetches an existing user review for a target, if any.
 */
export async function getUserReview(
  targetId: string,
  userId: string
): Promise<Review | null> {
  try {
    const docRef = doc(REVIEWS_COL, getReviewDocId(targetId, userId));
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return {
        ...(snap.data() as Review),
        reviewId: snap.id,
      };
    }
  } catch (err) {
    console.warn('[reviewService] getUserReview error:', err);
  }
  return null;
}

/**
 * Computes the rating summary and distribution bars for a set of reviews.
 */
export function calculateRatingBreakdown(reviews: Review[]): RatingBreakdown {
  const count = reviews.length;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (count === 0) {
    return {
      average: 0,
      count: 0,
      distribution,
      percentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  let totalScore = 0;
  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[star] += 1;
    totalScore += r.rating;
  }

  const rawAvg = totalScore / count;
  const average = Math.round(rawAvg * 10) / 10;

  const percentages = {
    1: Math.round((distribution[1] / count) * 100),
    2: Math.round((distribution[2] / count) * 100),
    3: Math.round((distribution[3] / count) * 100),
    4: Math.round((distribution[4] / count) * 100),
    5: Math.round((distribution[5] / count) * 100),
  };

  return { average, count, distribution, percentages };
}

/**
 * Updates the aggregated rating and reviewCount on the parent directory or event document.
 */
async function syncParentRatingAndCount(
  targetId: string,
  targetType: ReviewTargetType,
  average: number,
  count: number
): Promise<void> {
  try {
    const parentCollection = targetType === 'directory' ? 'directories' : 'city_events';
    const parentDocRef = doc(db, parentCollection, targetId);
    await updateDoc(parentDocRef, {
      rating: average,
      reviewCount: count,
    });
  } catch (err) {
    console.warn(`[reviewService] Failed to sync parent ${targetType} rating:`, err);
  }
}

/**
 * Submits or updates a review for a directory listing or city event.
 * Recalculates average rating and awards +5 civic points if first submission.
 */
export async function submitReview(
  params: SubmitReviewParams
): Promise<{ success: boolean; reviewId: string; isNew?: boolean; karmaEarned?: number; error?: string }> {
  try {
    const reviewDocId = getReviewDocId(params.targetId, params.userId);
    const reviewRef = doc(REVIEWS_COL, reviewDocId);
    const existingSnap = await getDoc(reviewRef);
    const isNew = !existingSnap.exists();

    const payload: Review = {
      reviewId: reviewDocId,
      targetId: params.targetId,
      targetType: params.targetType,
      targetTitle: params.targetTitle ?? '',
      userId: params.userId,
      userName: params.userName || 'Anonymous Citizen',
      userPhotoURL: params.userPhotoURL ?? null,
      rating: Math.min(5, Math.max(1, params.rating)),
      title: params.title?.trim() || '',
      comment: params.comment.trim(),
      tags: params.tags ?? [],
      likes: isNew ? [] : (existingSnap.data()?.likes ?? []),
      createdAt: isNew ? Timestamp.now() : existingSnap.data()?.createdAt ?? Timestamp.now(),
      updatedAt: isNew ? null : Timestamp.now(),
    };

    await setDoc(reviewRef, payload);

    // Recalculate parent rating & review count
    const allReviewsSnap = await getDocs(
      query(REVIEWS_COL, where('targetId', '==', params.targetId))
    );
    const allReviews = allReviewsSnap.docs.map((d) => d.data() as Review);
    const breakdown = calculateRatingBreakdown(allReviews);

    await syncParentRatingAndCount(
      params.targetId,
      params.targetType,
      breakdown.average,
      breakdown.count
    );

    // Award Civic Points on new review
    if (isNew) {
      try {
        await awardPoints(params.userId, REVIEW_KARMA_POINTS);
      } catch (ptsErr) {
        console.warn('[reviewService] awardPoints warning:', ptsErr);
      }
    }

    return {
      success: true,
      reviewId: reviewDocId,
      isNew,
      karmaEarned: isNew ? REVIEW_KARMA_POINTS : 0,
    };
  } catch (err: any) {
    console.error('[reviewService] submitReview error:', err);
    return { success: false, reviewId: '', error: err?.message ?? 'Failed to submit review' };
  }
}

/**
 * Deletes a review and updates the parent target's average rating and count.
 */
export async function deleteReview(
  targetId: string,
  targetType: ReviewTargetType,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const reviewDocId = getReviewDocId(targetId, userId);
    const reviewRef = doc(REVIEWS_COL, reviewDocId);

    await deleteDoc(reviewRef);

    // Recalculate parent rating & review count
    const allReviewsSnap = await getDocs(
      query(REVIEWS_COL, where('targetId', '==', targetId))
    );
    const allReviews = allReviewsSnap.docs.map((d) => d.data() as Review);
    const breakdown = calculateRatingBreakdown(allReviews);

    await syncParentRatingAndCount(
      targetId,
      targetType,
      breakdown.average,
      breakdown.count
    );

    return { success: true };
  } catch (err: any) {
    console.error('[reviewService] deleteReview error:', err);
    return { success: false, error: err?.message ?? 'Failed to delete review' };
  }
}

/**
 * Toggles a user's helpful like on a review.
 */
export async function toggleHelpfulReview(
  reviewId: string,
  userId: string,
  currentlyLiked: boolean
): Promise<void> {
  const ref = doc(REVIEWS_COL, reviewId);
  if (currentlyLiked) {
    await updateDoc(ref, {
      likes: arrayRemove(userId),
    });
  } else {
    await updateDoc(ref, {
      likes: arrayUnion(userId),
    });
  }
}
