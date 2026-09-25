import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { LegalSection } from '@/components/settings/LegalScreen';

export interface DynamicLegalDoc {
  title: string;
  lastUpdated: string;
  intro?: string;
  sections: LegalSection[];
  updatedAt?: any;
}

export interface DynamicAboutDoc {
  appName: string;
  tagline: string;
  missionPrimary: string;
  missionSecondary: string;
  contactEmail: string;
  highlights: Array<{
    icon: string;
    text: string;
  }>;
  updatedAt?: any;
}

/**
 * Hook to retrieve legal documents directly from Firestore.
 */
export function useDynamicLegal(docId: 'legal_privacy' | 'legal_terms') {
  const [content, setContent] = useState<DynamicLegalDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'app_config', docId);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<DynamicLegalDoc>;
          setContent({
            title: data.title || (docId === 'legal_privacy' ? 'Privacy Policy' : 'Terms & Conditions'),
            lastUpdated: data.lastUpdated || '',
            intro: data.intro || '',
            sections: data.sections || [],
            updatedAt: data.updatedAt,
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error(`[useDynamicLegal] Error loading ${docId}:`, error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [docId]);

  return { content, loading };
}

/**
 * Hook to retrieve About Us configuration directly from Firestore.
 */
export function useDynamicAbout() {
  const [content, setContent] = useState<DynamicAboutDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'app_config', 'app_about');
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<DynamicAboutDoc>;
          setContent({
            appName: data.appName || 'ReCiti',
            tagline: data.tagline || 'City Management & Smart Living',
            missionPrimary: data.missionPrimary || '',
            missionSecondary: data.missionSecondary || '',
            contactEmail: data.contactEmail || 'abhijitrabha.dev@gmail.com',
            highlights: data.highlights || [],
            updatedAt: data.updatedAt,
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error('[useDynamicAbout] Error loading app_about:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { content, loading };
}

