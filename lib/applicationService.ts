import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  CivicApplication,
  ApplicationType,
  ApplicationStatus,
} from '@/types';

const APPLICATIONS_COLLECTION = 'applications';

/**
 * Recursively cleans any undefined values so Firestore never rejects the document
 */
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    clean[key] = val === undefined ? null : sanitizeForFirestore(val);
  }
  return clean;
}

/**
 * Submits a new Civic or Commercial Application
 */
export async function submitCivicApplication<T extends Record<string, any>>(params: {
  type: ApplicationType;
  typeLabel: string;
  applicantUid: string;
  applicant: {
    name: string;
    email: string;
    phone: string;
    photoURL?: string | null;
  };
  cityName: string;
  locality?: string | null;
  data: T;
}): Promise<string> {
  const {
    type,
    typeLabel,
    applicantUid,
    applicant,
    cityName,
    locality,
    data,
  } = params;

  const colRef = collection(db, APPLICATIONS_COLLECTION);
  const now = Date.now();

  const docPayload = sanitizeForFirestore({
    type,
    typeLabel,
    applicantUid,
    applicant: {
      name: applicant.name.trim(),
      email: applicant.email.trim(),
      phone: applicant.phone.trim(),
      photoURL: applicant.photoURL || null,
    },
    cityName: cityName.trim(),
    locality: locality?.trim() || null,
    status: 'pending' as ApplicationStatus,
    data,
    appliedAt: now,
    updatedAt: now,
  });

  const docRef = await addDoc(colRef, docPayload);
  return docRef.id;
}

/**
 * Withdraws a pending application
 */
export async function withdrawCivicApplication(applicationId: string): Promise<void> {
  const docRef = doc(db, APPLICATIONS_COLLECTION, applicationId);
  await updateDoc(docRef, {
    status: 'withdrawn',
    updatedAt: Date.now(),
  });
}

/**
 * React hook to listen to the user's latest application of a given type
 */
export function useUserApplication<T = Record<string, any>>(
  type: ApplicationType,
  applicantUid?: string | null
) {
  const [application, setApplication] = useState<CivicApplication<T> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!applicantUid) {
      setApplication(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const colRef = collection(db, APPLICATIONS_COLLECTION);
    const q = query(
      colRef,
      where('applicantUid', '==', applicantUid),
      where('type', '==', type)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          } as CivicApplication<T>));
          // Sort in memory by appliedAt desc to get the most recent submission
          list.sort((a, b) => (b.appliedAt || 0) - (a.appliedAt || 0));
          setApplication(list[0]);
        } else {
          setApplication(null);
        }
        setLoading(false);
      },
      (error) => {
        console.warn(`[useUserApplication] Error listening to applications:`, error);
        setLoading(false);
      }
    );

    return unsub;
  }, [type, applicantUid]);

  return {
    application,
    loading,
    hasApplied: !!application && application.status !== 'withdrawn',
  };
}
