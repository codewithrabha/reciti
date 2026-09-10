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

export const MOCK_EVENTS: CityEvent[] = [
  {
    id: 'evt-1',
    title: 'Eco-Park Community Clean-up & Tree Drive',
    category: 'civic',
    description: 'Join fellow citizens and local volunteers for a morning park restoration initiative. We will be clearing shoreline debris, planting 150 native flowering saplings, and cataloging biodiversity points. Gloves, trash bags, and refreshments provided.',
    date: 'Saturday, 12 Sept',
    time: '7:00 AM - 10:30 AM',
    locationName: 'Eco Park Promenade, North Gate',
    address: 'Near Gandhi Maidan, Bongaigaon',
    city: 'Bongaigaon',
    latitude: 26.4586,
    longitude: 90.5591,
    imageUrl: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800&auto=format&fit=crop&q=80',
    price: 'Free',
    organizerName: 'ReCiti Volunteer Guild & Eco Watch',
    organizerType: 'municipal',
    isVerifiedOrganizer: true,
    isSponsored: true,
    civicPointsReward: 75,
    status: 'active',
  },
  {
    id: 'evt-2',
    title: 'Bengaluru Indie Music & Acoustic Sundowner',
    category: 'concerts',
    description: 'An open-air evening celebrating homegrown indie folk bands, acoustic sets, and fusion instrumentalists under the amphitheater canopy. Bring your picnic mats and enjoy an enchanting dusk with the city music community.',
    date: 'Sunday, 13 Sept',
    time: '5:30 PM - 9:30 PM',
    locationName: 'Freedom Park Open Amphitheatre',
    address: 'Sheshadri Road, Gandhi Nagar, Bengaluru',
    city: 'Bengaluru',
    latitude: 12.9833,
    longitude: 77.5802,
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
    price: '₹250',
    organizerName: 'City Vibes Collective',
    organizerType: 'business',
    isVerifiedOrganizer: true,
    isSponsored: true,
    civicPointsReward: 10,
    status: 'active',
  },
  {
    id: 'evt-3',
    title: 'Annual Heritage Craft & Artisan Pottery Fair',
    category: 'fairs',
    description: 'Showcasing 60+ master craftsmen, terracotta potters, handloom weavers, and traditional woodcarvers from across the region. Live pottery wheel demos, clay sculpting sessions, and direct artisan commerce.',
    date: '18 - 20 Sept',
    time: '10:00 AM - 8:00 PM',
    locationName: 'Chitrakala Parishath Grounds',
    address: 'Kumara Krupa Road, Bengaluru',
    city: 'Bengaluru',
    latitude: 12.9904,
    longitude: 77.5828,
    imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80',
    price: 'Free',
    organizerName: 'Regional Crafts Council',
    organizerType: 'ngo',
    isVerifiedOrganizer: true,
    isSponsored: false,
    civicPointsReward: 20,
    status: 'active',
  },
  {
    id: 'evt-4',
    title: 'Namma City Twilight 10K & 5K Run',
    category: 'sports',
    description: 'An energetic evening marathon promoting road safety, pedestrian rights, and clean air. Safe traffic-managed route with hydration stations, emergency medical support, finisher medals, and post-run music.',
    date: 'Saturday, 26 Sept',
    time: '6:00 PM - 8:30 PM',
    locationName: 'Cubbon Park Bandstand',
    address: 'Kasturba Road, Bengaluru',
    city: 'Bengaluru',
    latitude: 12.9763,
    longitude: 77.5929,
    imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&auto=format&fit=crop&q=80',
    price: '₹400',
    organizerName: 'City Runners Guild',
    organizerType: 'ngo',
    isVerifiedOrganizer: true,
    isSponsored: true,
    civicPointsReward: 40,
    status: 'active',
  },
  {
    id: 'evt-5',
    title: 'City Street Art & Mural Walk',
    category: 'cultural',
    description: 'A guided 2-hour walking tour uncovering the stories, public artists, and community messages behind the vibrant murals adorning the streets and flyovers of the city.',
    date: 'Sunday, 27 Sept',
    time: '8:00 AM - 10:00 AM',
    locationName: 'MG Road Metro Boulevard',
    address: 'MG Road, Bengaluru',
    city: 'Bengaluru',
    latitude: 12.9754,
    longitude: 77.6067,
    imageUrl: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800&auto=format&fit=crop&q=80',
    price: '₹150',
    organizerName: 'Public Canvas Initiative',
    organizerType: 'citizen',
    isVerifiedOrganizer: false,
    isSponsored: false,
    civicPointsReward: 15,
    status: 'active',
  },
  {
    id: 'evt-6',
    title: 'Zero Waste Home Composting & Terrace Gardening',
    category: 'workshops',
    description: 'Hands-on practical masterclass on setting up odor-free home composting bins, segregating organic waste, and growing pest-resistant kitchen vegetables in apartment balconies.',
    date: 'Saturday, 3 Oct',
    time: '3:00 PM - 5:30 PM',
    locationName: 'Community Center, 12th Main',
    address: 'Indiranagar, Bengaluru',
    city: 'Bengaluru',
    latitude: 12.9712,
    longitude: 77.6431,
    imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&auto=format&fit=crop&q=80',
    price: 'Free',
    organizerName: 'ReCiti Green Living Lab',
    organizerType: 'municipal',
    isVerifiedOrganizer: true,
    isSponsored: false,
    civicPointsReward: 35,
    status: 'active',
  },
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
    console.warn('[eventService] Firestore query error, falling back to mock events:', err);
  }

  // If collection is empty or unreachable, fall back to mock data
  if (items.length === 0) {
    items = [...MOCK_EVENTS];
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
    console.warn('[eventService] Firestore get error, checking mock list:', err);
  }

  const found = MOCK_EVENTS.find((e) => e.id === id);
  return found ?? null;
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
