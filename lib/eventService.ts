import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { CityEvent, EventCategory, EventSubcategory } from '@/types';

export interface EventSubcategoryMeta {
  key: EventSubcategory;
  label: string;
  icon: string;
  description?: string;
}

export interface EventCategoryMeta {
  key: EventCategory | 'all';
  label: string;
  icon: string;
  subcategories: EventSubcategoryMeta[];
}

export const EVENT_SECTORS: EventCategoryMeta[] = [
  {
    key: 'all',
    label: 'All Events',
    icon: 'sparkles-outline',
    subcategories: [],
  },
  {
    key: 'cultural_religious',
    label: 'Cultural & Religious',
    icon: 'color-palette-outline',
    subcategories: [
      {
        key: 'pujas_celebrations',
        label: 'Major Pujas & Celebrations',
        icon: 'flower-outline',
        description: 'Durga Puja, Kali Puja, Saraswati Puja and community events',
      },
      {
        key: 'folk_festivals',
        label: 'Traditional & Folk Festivals',
        icon: 'musical-note-outline',
        description: 'Rongali/Bhogali Bihu, local melas and folk celebrations',
      },
      {
        key: 'processions_gatherings',
        label: 'Religious Gatherings & Processions',
        icon: 'people-outline',
        description: 'Naam prasanga, satsangs, rath yatras and anniversaries',
      },
    ],
  },
  {
    key: 'sports_tournaments',
    label: 'Sports & Tournaments',
    icon: 'football-outline',
    subcategories: [
      {
        key: 'leagues_championships',
        label: 'Local Leagues & Championships',
        icon: 'trophy-outline',
        description: 'Inter-club football, cricket, badminton & table tennis',
      },
      {
        key: 'marathons_walks',
        label: 'Marathons & Fitness Walks',
        icon: 'fitness-outline',
        description: 'Community runs, cyclothons, and yoga day gatherings',
      },
      {
        key: 'traditional_sports',
        label: 'Traditional Sports',
        icon: 'medal-outline',
        description: 'Local and indigenous competitive sports events',
      },
    ],
  },
  {
    key: 'business_trade_community',
    label: 'Business, Trade & Community',
    icon: 'briefcase-outline',
    subcategories: [
      {
        key: 'trade_fairs_expos',
        label: 'Trade Fairs & Exhibitions',
        icon: 'storefront-outline',
        description: 'Industrial expos, handloom/khadi melas, book fairs',
      },
      {
        key: 'business_inaugurations',
        label: 'Business Inaugurations',
        icon: 'ribbon-outline',
        description: 'Store openings, showroom launches, milestone events',
      },
      {
        key: 'networking_workshops',
        label: 'Networking & Workshops',
        icon: 'bulb-outline',
        description: 'Startup meetups, skill workshops, professional seminars',
      },
    ],
  },
  {
    key: 'entertainment_arts',
    label: 'Entertainment & Arts',
    icon: 'film-outline',
    subcategories: [
      {
        key: 'music_concerts_gigs',
        label: 'Music Concerts & Live Gigs',
        icon: 'musical-notes-outline',
        description: 'Musical nights, Bihu performances, live bands & DJs',
      },
      {
        key: 'plays_drama_theatre',
        label: 'Stage Plays & Drama',
        icon: 'videocam-outline',
        description: 'Mobile theatre (Bhaona / Jatra), drama clubs & stage acts',
      },
      {
        key: 'art_photo_exhibitions',
        label: 'Art & Photography Exhibitions',
        icon: 'images-outline',
        description: 'Local talent showcases, art displays & craft markets',
      },
    ],
  },
  {
    key: 'social_public_awareness',
    label: 'Social & Public Awareness',
    icon: 'heart-half-outline',
    subcategories: [
      {
        key: 'health_wellness_camps',
        label: 'Health Camps',
        icon: 'medkit-outline',
        description: 'Free blood donation, eye check-ups & wellness drives',
      },
      {
        key: 'civic_environmental_drives',
        label: 'Civic & Environmental Drives',
        icon: 'leaf-outline',
        description: 'Swachh cleanliness drives, tree plantations, safety seminars',
      },
      {
        key: 'gov_public_outreach',
        label: 'Government & Public Outreach',
        icon: 'megaphone-outline',
        description: 'Voter awareness, civic grievance forums, municipal updates',
      },
    ],
  },
];

let dynamicEventSectors: EventCategoryMeta[] = [...EVENT_SECTORS];

export function subscribeDynamicEventCategories(
  onUpdate?: (sectors: EventCategoryMeta[]) => void
): () => void {
  try {
    const q = query(collection(db, 'event_categories'), orderBy('order', 'asc'));
    return onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const loaded: EventCategoryMeta[] = [
            { key: 'all', label: 'All Events', icon: 'sparkles-outline', subcategories: [] },
          ];
          snap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.isActive !== false) {
              loaded.push({
                key: (data.id || docSnap.id) as EventCategory,
                label: data.label || docSnap.id,
                icon: data.icon || 'sparkles-outline',
                subcategories: (data.subcategories || [])
                  .filter((s: any) => s.isActive !== false)
                  .map((s: any) => ({
                    key: s.id as EventSubcategory,
                    label: s.label,
                    icon: s.icon || 'calendar-outline',
                    description: s.description,
                  })),
              });
            }
          });
          dynamicEventSectors = loaded;
          if (onUpdate) onUpdate(dynamicEventSectors);
        }
      },
      (err) => {
        console.warn('[eventService] subscribeDynamicEventCategories error (using fallbacks):', err);
      }
    );
  } catch (err) {
    console.warn('[eventService] Failed to set up dynamic event categories listener:', err);
    return () => {};
  }
}

export function getDynamicEventSectors(): EventCategoryMeta[] {
  return dynamicEventSectors;
}

// Flat categories list for backward compatibility with components using EVENT_CATEGORIES
export const EVENT_CATEGORIES = EVENT_SECTORS.map((s) => ({
  key: s.key,
  label: s.label,
  icon: s.icon,
}));

// Legacy category mappings to new top-level categories
const LEGACY_CATEGORY_MAP: Record<string, EventCategory> = {
  cultural: 'cultural_religious',
  civic: 'social_public_awareness',
  sports: 'sports_tournaments',
  concerts: 'entertainment_arts',
  fairs: 'business_trade_community',
  workshops: 'business_trade_community',
};

export function getEventCategoryMeta(category?: string): EventCategoryMeta | undefined {
  if (!category) return undefined;
  const mappedKey = LEGACY_CATEGORY_MAP[category] || category;
  return dynamicEventSectors.find((s) => s.key === mappedKey) || EVENT_SECTORS.find((s) => s.key === mappedKey);
}

export function getEventCategoryLabel(category?: string): string {
  if (!category) return 'Event';
  const meta = getEventCategoryMeta(category);
  if (meta) return meta.label;
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getEventSubcategoryLabel(subcategory?: string): string | undefined {
  if (!subcategory) return undefined;
  for (const sector of dynamicEventSectors) {
    const sub = sector.subcategories.find((s) => s.key === subcategory);
    if (sub) return sub.label;
  }
  for (const sector of EVENT_SECTORS) {
    const sub = sector.subcategories.find((s) => s.key === subcategory);
    if (sub) return sub.label;
  }
  return subcategory.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const EVENTS_COL = collection(db, 'city_events');

export async function getUpcomingEvents(
  category?: EventCategory | 'all',
  subcategory?: EventSubcategory | 'all',
  search?: string,
  city?: string
): Promise<CityEvent[]> {
  let items: CityEvent[] = [];

  try {
    const snap = await getDocs(EVENTS_COL);
    if (!snap.empty) {
      items = snap.docs.map((docSnap) => {
        const data = docSnap.data() as Omit<CityEvent, 'id'>;
        return {
          id: docSnap.id,
          ...data,
          subcategoryLabel: data.subcategoryLabel || getEventSubcategoryLabel(data.subcategory),
        };
      });
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
    items = items.filter((e) => {
      if (e.category === category) return true;
      // Also match legacy categories that map to this category
      const legacyMapped = LEGACY_CATEGORY_MAP[e.category];
      return legacyMapped === category;
    });
  }

  // Filter by subcategory
  if (subcategory && subcategory !== 'all') {
    items = items.filter((e) => e.subcategory === subcategory);
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
        e.category.toLowerCase().includes(q) ||
        (e.subcategory && e.subcategory.toLowerCase().includes(q)) ||
        (e.subcategoryLabel && e.subcategoryLabel.toLowerCase().includes(q)) ||
        (e.organizerName && e.organizerName.toLowerCase().includes(q))
    );
  }

  return items;
}

export async function getEventById(id: string): Promise<CityEvent | null> {
  try {
    const docRef = doc(EVENTS_COL, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Omit<CityEvent, 'id'>;
      return {
        id: snap.id,
        ...data,
        subcategoryLabel: data.subcategoryLabel || getEventSubcategoryLabel(data.subcategory),
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
      subcategoryLabel: eventData.subcategoryLabel || getEventSubcategoryLabel(eventData.subcategory),
    };

    await setDoc(eventDocRef, payload);
    return { success: true, id: eventDocRef.id };
  } catch (err: any) {
    console.error('[eventService] createCityEvent error:', err);
    return { success: false, error: err?.message ?? 'Failed to publish event' };
  }
}

/**
 * Fetches all community/civic events organized by the user.
 */
export async function getUserEvents(organizerUid: string): Promise<CityEvent[]> {
  try {
    const q = query(EVENTS_COL, where('organizerId', '==', organizerUid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as Omit<CityEvent, 'id'>;
      return {
        id: d.id,
        ...data,
        subcategoryLabel: data.subcategoryLabel || getEventSubcategoryLabel(data.subcategory),
      };
    });
  } catch (err) {
    console.warn('[eventService] getUserEvents error:', err);
    return [];
  }
}
