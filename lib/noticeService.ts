import { collection, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import { CityNotice } from '@/types';

const NOTICES_COL = collection(db, 'city_notices');
const FIRST_INSTALL_KEY = '@reciti_first_install_time';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 72 hours

/**
 * Checks whether the current device is within its first 3 days since initial app launch.
 */
export async function isWithinOnboardingWindow(): Promise<boolean> {
  try {
    let installTimeStr = await AsyncStorage.getItem(FIRST_INSTALL_KEY);
    const now = Date.now();

    if (!installTimeStr) {
      // First time launch on this installation — record timestamp
      await AsyncStorage.setItem(FIRST_INSTALL_KEY, now.toString());
      return true;
    }

    const installTime = parseInt(installTimeStr, 10);
    return !isNaN(installTime) && now - installTime < THREE_DAYS_MS;
  } catch (err) {
    console.warn('[noticeService] Error checking install timestamp:', err);
    return false;
  }
}

/**
 * Fetches active city notices dynamically from Firestore.
 * - Targets the user's detected city (falling back to 'all' if no city-specific notices exist)
 * - Dynamically includes 'new_users' onboarding notices if user is in their 3-day welcome window
 * - Applies priority ranking: pinned notices first, then urgent -> high -> normal
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

  // 1. Expiry Date Filter (filter out past notices; null/empty expiresAt means permanent)
  const now = Date.now();
  list = list.filter((n) => {
    if (!n.expiresAt) return true;
    const expiryTime = new Date(n.expiresAt).getTime();
    if (isNaN(expiryTime)) return true;
    return expiryTime > now;
  });

  // 2. Dynamic 3-Day Welcome Window Filter
  const isNewUser = await isWithinOnboardingWindow();
  if (!isNewUser) {
    // Mature user: filter out new-user onboarding notices
    list = list.filter((n) => n.targetAudience !== 'new_users');
  }

  // 3. City-aware filtering
  let cityFiltered = list;
  if (city && city.trim().length > 0) {
    const query = city.trim().toLowerCase();
    cityFiltered = list.filter(
      (n) => n.city.toLowerCase() === query || n.city.toLowerCase() === 'all'
    );

    // If city has no matching notices, fall back to global notices so hero is not empty
    if (cityFiltered.length === 0) {
      cityFiltered = list.filter((n) => n.city.toLowerCase() === 'all');
    }
  }

  // 3. Priority Ranking Sort
  const priorityRank: Record<string, number> = { urgent: 3, high: 2, normal: 1 };
  cityFiltered.sort((a, b) => {
    // Pinned notices first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // Priority rank: urgent (3) > high (2) > normal (1)
    const pDiff = (priorityRank[b.priority] ?? 1) - (priorityRank[a.priority] ?? 1);
    if (pDiff !== 0) return pDiff;

    // Newest first if creation timestamp is available
    const timeA = a.createdAt?.seconds ?? 0;
    const timeB = b.createdAt?.seconds ?? 0;
    return timeB - timeA;
  });

  return cityFiltered;
}
