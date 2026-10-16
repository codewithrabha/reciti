import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { WaitlistSubscription, WaitlistFeatureId } from '@/types';

const WAITLISTS_COLLECTION = 'waitlists';

/**
 * Builds deterministic idempotent document ID for a waitlist subscription
 */
export function getWaitlistDocId(featureId: WaitlistFeatureId, userIdOrEmail: string): string {
  const cleanId = userIdOrEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${featureId}_${cleanId}`;
}

/**
 * Subscribes a citizen to a feature waitlist
 */
export async function subscribeToWaitlist(params: {
  featureId: WaitlistFeatureId;
  featureLabel: string;
  userId: string | null;
  email?: string | null;
  displayName?: string | null;
  cityName: string;
  metadata?: Record<string, any>;
  source?: 'mobile_app' | 'web';
}): Promise<string> {
  const {
    featureId,
    featureLabel,
    userId,
    email = null,
    displayName = null,
    cityName,
    metadata = {},
    source = 'mobile_app',
  } = params;

  const key = userId || email || `anon_${Date.now()}`;
  const docId = getWaitlistDocId(featureId, key);
  const docRef = doc(db, WAITLISTS_COLLECTION, docId);

  const payload: WaitlistSubscription = {
    id: docId,
    featureId,
    featureLabel,
    userId,
    email,
    displayName,
    cityName,
    status: 'subscribed',
    metadata,
    subscribedAt: Date.now(),
    source,
  };

  await setDoc(docRef, payload, { merge: true });
  return docId;
}

/**
 * Removes a citizen's subscription from a feature waitlist
 */
export async function unsubscribeFromWaitlist(
  featureId: WaitlistFeatureId,
  userIdOrEmail: string
): Promise<void> {
  const docId = getWaitlistDocId(featureId, userIdOrEmail);
  const docRef = doc(db, WAITLISTS_COLLECTION, docId);
  await deleteDoc(docRef);
}

/**
 * Fetches a citizen's waitlist subscription once
 */
export async function getWaitlistSubscription(
  featureId: WaitlistFeatureId,
  userIdOrEmail: string
): Promise<WaitlistSubscription | null> {
  const docId = getWaitlistDocId(featureId, userIdOrEmail);
  const docRef = doc(db, WAITLISTS_COLLECTION, docId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data() as WaitlistSubscription;
}

/**
 * Reactive React hook to observe and toggle waitlist status
 */
export function useWaitlistStatus(
  featureId: WaitlistFeatureId,
  featureLabel: string,
  userId?: string | null,
  userEmail?: string | null,
  userName?: string | null,
  cityName: string = 'Local Hub'
) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<WaitlistSubscription | null>(null);

  const identifier = userId || userEmail;

  useEffect(() => {
    if (!identifier) {
      setIsSubscribed(false);
      setSubscription(null);
      setLoading(false);
      return;
    }

    const docId = getWaitlistDocId(featureId, identifier);
    const docRef = doc(db, WAITLISTS_COLLECTION, docId);

    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as WaitlistSubscription;
          setIsSubscribed(data.status === 'subscribed');
          setSubscription(data);
        } else {
          setIsSubscribed(false);
          setSubscription(null);
        }
        setLoading(false);
      },
      (error) => {
        console.warn(`[useWaitlistStatus] Error listening to waitlist ${docId}:`, error);
        setLoading(false);
      }
    );

    return unsub;
  }, [featureId, identifier]);

  const toggleSubscription = useCallback(async () => {
    if (!identifier) return false;

    if (isSubscribed) {
      await unsubscribeFromWaitlist(featureId, identifier);
      return false;
    } else {
      await subscribeToWaitlist({
        featureId,
        featureLabel,
        userId: userId || null,
        email: userEmail || null,
        displayName: userName || null,
        cityName,
      });
      return true;
    }
  }, [identifier, isSubscribed, featureId, featureLabel, userId, userEmail, userName, cityName]);

  return {
    isSubscribed,
    loading,
    subscription,
    toggleSubscription,
  };
}
