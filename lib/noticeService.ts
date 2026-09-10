import { collection, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import { CityNotice } from '@/types';

const NOTICES_COL = collection(db, 'city_notices');
const FIRST_INSTALL_KEY = '@reciti_first_install_time';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 72 hours in milliseconds

// ─── 3 Default Onboarding / Welcome Slides ──────────────────────────────────
export const WELCOME_NOTICES: CityNotice[] = [
  {
    id: 'welcome-slide-1',
    title: 'Spot, Report & Resolve Civic Issues',
    description: 'See a pothole, broken streetlight, or garbage hazard? Snap a photo with location to alert your community and watch it get resolved.',
    category: 'app_update',
    displayType: 'feature_update',
    priority: 'urgent',
    city: 'all',
    badgeText: 'WELCOME TO RECITI',
    issuedBy: 'ReCiti Citizen Network',
    date: 'Getting Started',
    actionLabel: 'Report Issue',
    actionUrl: '/(tabs)/capture',
    actionType: 'route',
    isPinned: true,
  },
  {
    id: 'welcome-slide-2',
    title: 'Verify Neighbor Issues & Earn Civic Coins',
    description: 'Every issue is verified by 3 real neighbors before city escalation. Confirm issues and fixes around you to earn Civic Coins (C-Coins) and unlock citizen rewards.',
    category: 'app_update',
    displayType: 'feature_update',
    priority: 'high',
    city: 'all',
    badgeText: 'CIVIC COIN',
    issuedBy: 'C-Coin Rewards',
    date: 'Coins & Ranks',
    actionLabel: 'View Coins',
    actionUrl: '/(tabs)/profile',
    actionType: 'route',
    isPinned: true,
  },
  {
    id: 'welcome-slide-3',
    title: 'Discover Local Places & Official Notices',
    description: 'Find verified hospitals, shops, and institutions in Bongaigaon. Stay updated with real-time municipal announcements and alerts.',
    category: 'app_update',
    displayType: 'feature_update',
    priority: 'high',
    city: 'all',
    badgeText: 'EXPLORE YOUR CITY',
    issuedBy: 'City Hub',
    date: 'Directory & Alerts',
    actionLabel: 'Explore Places',
    actionUrl: '/(tabs)/directories',
    actionType: 'route',
    isPinned: true,
  },
];

/**
 * Checks if the user is within their first 3 days of installing the app.
 * If so, returns the 3 welcome onboarding slides; otherwise returns an empty array.
 */
export async function getWelcomeNotices(): Promise<CityNotice[]> {
  try {
    let installTimeStr = await AsyncStorage.getItem(FIRST_INSTALL_KEY);
    const now = Date.now();

    if (!installTimeStr) {
      // First time launch on this installation — record timestamp
      await AsyncStorage.setItem(FIRST_INSTALL_KEY, now.toString());
      installTimeStr = now.toString();
    }

    const installTime = parseInt(installTimeStr, 10);
    const isWithin3Days = !isNaN(installTime) && now - installTime < THREE_DAYS_MS;

    if (isWithin3Days) {
      return [...WELCOME_NOTICES];
    }
  } catch (err) {
    console.warn('[noticeService] Error checking install timestamp:', err);
  }
  return [];
}

/**
 * Fetches active city notices from Firestore, combined with the 3 welcome slides
 * if the user is within their 3-day onboarding window.
 */
export async function getCityNotices(city?: string | null): Promise<CityNotice[]> {
  let list: CityNotice[] = [];

  try {
    const snap = await getDocs(NOTICES_COL);
    if (!snap.empty) {
      list = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<CityNotice, 'id'>),
      }));
    }
  } catch (err) {
    console.warn('[noticeService] Firestore query error:', err);
  }

  // Filter Firestore notices by city if specified
  if (city && city.trim().length > 0) {
    const query = city.trim().toLowerCase();
    list = list.filter(
      (n) => n.city.toLowerCase() === query || n.city.toLowerCase() === 'all'
    );
  }

  // Retrieve 3-day welcome onboarding slides
  const welcomeSlides = await getWelcomeNotices();

  // Combine welcome slides (pinned at front) with live municipal notices
  const combined = [...welcomeSlides, ...list];

  // Sort: pinned notices first, then urgent priority, then high, then normal
  const priorityRank: Record<string, number> = { urgent: 3, high: 2, normal: 1 };
  combined.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (priorityRank[b.priority] ?? 1) - (priorityRank[a.priority] ?? 1);
  });

  return combined;
}
