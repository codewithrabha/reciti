import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { CityEvent, EventCategory } from '@/types';

export const EVENT_CATEGORIES: { key: EventCategory | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'sparkles-outline' },
  { key: 'civic', label: 'Civic & Cleanups', icon: 'leaf-outline' },
  { key: 'cultural', label: 'Cultural', icon: 'color-palette-outline' },
  { key: 'concerts', label: 'Concerts', icon: 'musical-notes-outline' },
  { key: 'fairs', label: 'Fairs & Markets', icon: 'storefront-outline' },
  { key: 'sports', label: 'Sports & Fitness', icon: 'fitness-outline' },
  { key: 'workshops', label: 'Workshops', icon: 'hammer-outline' },
];
const EVENTS_COL = collection(db, 'city_events');

export async function getUpcomingEvents(
  category?: EventCategory | 'all',
  search?: string,
  city?: string
): Promise<CityEvent[]> {
  let items: CityEvent[] = [];

  try {
    const snap = await getDocs(EVENTS_COL);
    if (!snap.empty) {
      items = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<CityEvent, 'id'>),
      }));
    }
  } catch (err) {
    console.warn('[eventService] Firestore query error:', err);
  }

  // Filter by city
  if (city && city.trim().length > 0) {
    const c = city.trim().toLowerCase();
    items = items.filter((e) => e.city && e.city.toLowerCase() === c);
  }

  // Filter by category
  if (category && category !== 'all') {
    items = items.filter((e) => e.category === category);
  }

  // Filter by search query
  if (search && search.trim().length > 0) {
    const q = search.trim().toLowerCase();
    items = items.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.locationName.toLowerCase().includes(q) ||
        (e.city && e.city.toLowerCase().includes(q)) ||
        e.category.toLowerCase().includes(q)
    );
  }

  return items;
}

export async function getEventById(id: string): Promise<CityEvent | null> {
  try {
    const docRef = doc(EVENTS_COL, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return {
        id: snap.id,
        ...(snap.data() as Omit<CityEvent, 'id'>),
      };
    }
  } catch (err) {
    console.warn('[eventService] Firestore get error:', err);
  }

  return null;
}

/**
 * Creates a new community or civic event hosted by a verified citizen, organizer, or municipal body.
 */
export async function createCityEvent(
  eventData: Omit<CityEvent, 'id'>,
  organizerUid: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const eventDocRef = doc(EVENTS_COL);
    const payload: CityEvent = {
      ...eventData,
      id: eventDocRef.id,
      organizerId: organizerUid,
      status: 'active',
    };

    await setDoc(eventDocRef, payload);
    return { success: true, id: eventDocRef.id };
  } catch (err: any) {
    console.error('[eventService] createCityEvent error:', err);
    return { success: false, error: err?.message ?? 'Failed to publish event' };
  }
}
