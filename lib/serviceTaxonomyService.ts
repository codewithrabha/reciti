import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';

export const SERVICE_CATEGORIES_COL = 'service_categories';

export interface ServiceCategoryMeta {
  key: string;
  label: string;
  icon: string;
  imageUrl?: string | null;
  bannerImageUrl?: string | null;
  description?: string;
  badgeText?: string;
  linkedDirectoryCategoryIds?: string[];
  subcategories: {
    key: string;
    label: string;
    icon: string;
    imageUrl?: string | null;
  }[];
}

// Fallback seeds in case Firestore offline or initializing
const DEFAULT_SERVICE_CATEGORY_METAS: ServiceCategoryMeta[] = [
  {
    key: 'all',
    label: 'All Services',
    icon: 'sparkles',
    imageUrl: null,
    bannerImageUrl: null,
    subcategories: [],
  },
  {
    key: 'home_repairs',
    label: 'Home Repairs',
    icon: 'construct-outline',
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    bannerImageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&h=500&q=80',
    linkedDirectoryCategoryIds: ['services'],
    subcategories: [
      { key: 'electricians', label: 'Electricians', icon: 'flash-outline' },
      { key: 'plumbers', label: 'Plumbers', icon: 'water-outline' },
      { key: 'appliance_repair', label: 'Appliance Fixes', icon: 'hardware-chip-outline' },
    ],
  },
  {
    key: 'health_wellness',
    label: 'Healthcare',
    icon: 'medkit-outline',
    imageUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80',
    bannerImageUrl: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1200&h=500&q=80',
    linkedDirectoryCategoryIds: ['healthcare'],
    subcategories: [
      { key: 'general_physicians', label: 'General Physicians', icon: 'medkit-outline' },
      { key: 'dentists', label: 'Dentists', icon: 'fitness-outline' },
    ],
  },
  {
    key: 'beauty_salon',
    label: 'Salon & Spa',
    icon: 'cut-outline',
    imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
    bannerImageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&h=500&q=80',
    linkedDirectoryCategoryIds: ['services', 'retail'],
    subcategories: [
      { key: 'hair_salon', label: 'Hair Styling', icon: 'cut-outline' },
      { key: 'spa_massage', label: 'Spa & Massage', icon: 'sparkles-outline' },
    ],
  },
  {
    key: 'cleaning_pest',
    label: 'Cleaning',
    icon: 'water-outline',
    imageUrl: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=800&q=80',
    bannerImageUrl: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1200&h=500&q=80',
    linkedDirectoryCategoryIds: ['services', 'housing_rentals'],
    subcategories: [
      { key: 'deep_home_cleaning', label: 'Deep Cleaning', icon: 'home-outline' },
      { key: 'pest_control', label: 'Pest Control', icon: 'bug-outline' },
    ],
  },
  {
    key: 'sports_fitness',
    label: 'Sports & Turf',
    icon: 'football-outline',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
    bannerImageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&h=500&q=80',
    linkedDirectoryCategoryIds: ['sports_fitness'],
    subcategories: [
      { key: 'turf_bookings', label: 'Turf Booking', icon: 'football-outline' },
      { key: 'gym_training', label: 'Gym & Fitness', icon: 'barbell-outline' },
    ],
  },
  {
    key: 'education_coaching',
    label: 'Tutors & Lessons',
    icon: 'school-outline',
    imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
    bannerImageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&h=500&q=80',
    linkedDirectoryCategoryIds: ['education'],
    subcategories: [
      { key: 'home_tutors', label: 'Home Tutors', icon: 'book-outline' },
      { key: 'driving_school', label: 'Driving Lessons', icon: 'car-outline' },
    ],
  },
  {
    key: 'events_creative',
    label: 'Events & Media',
    icon: 'camera-outline',
    imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
    bannerImageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&h=500&q=80',
    linkedDirectoryCategoryIds: ['events', 'services'],
    subcategories: [
      { key: 'event_photography', label: 'Photography', icon: 'camera-outline' },
      { key: 'dj_sound_system', label: 'DJ & Sound', icon: 'volume-high-outline' },
    ],
  },
  {
    key: 'vehicle_services',
    label: 'Auto Care',
    icon: 'car-sport-outline',
    imageUrl: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80',
    bannerImageUrl: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1200&h=500&q=80',
    linkedDirectoryCategoryIds: ['services'],
    subcategories: [
      { key: 'car_wash_detailing', label: 'Car Wash', icon: 'car-outline' },
      { key: 'bike_repair_servicing', label: 'Bike Servicing', icon: 'bicycle-outline' },
    ],
  },
];

let cachedServiceCategories: ServiceCategoryMeta[] = DEFAULT_SERVICE_CATEGORY_METAS;
let serviceCategoriesSubscribed = false;
let serviceCategoryListeners: Array<(categories: ServiceCategoryMeta[]) => void> = [];

/**
 * Real-time subscription to dynamic service categories in Firestore.
 */
export function subscribeServiceCategories(
  onUpdate?: (categories: ServiceCategoryMeta[]) => void
): () => void {
  if (onUpdate) {
    serviceCategoryListeners.push(onUpdate);
    onUpdate(cachedServiceCategories);
  }

  if (!serviceCategoriesSubscribed) {
    serviceCategoriesSubscribed = true;
    try {
      const q = query(collection(db, SERVICE_CATEGORIES_COL), orderBy('order', 'asc'));
      onSnapshot(
        q,
        (snap) => {
          if (!snap.empty) {
            const loaded: ServiceCategoryMeta[] = [
              { key: 'all', label: 'All Services', icon: 'sparkles', imageUrl: null, bannerImageUrl: null, subcategories: [] },
            ];

            snap.docs.forEach((docSnap) => {
              const data = docSnap.data();
              if (data.isActive !== false) {
                loaded.push({
                  key: data.id || docSnap.id,
                  label: data.label || docSnap.id,
                  icon: data.icon || 'construct-outline',
                  imageUrl: data.imageUrl || null,
                  bannerImageUrl: data.bannerImageUrl || null,
                  description: data.description,
                  badgeText: data.badgeText,
                  linkedDirectoryCategoryIds: Array.isArray(data.linkedDirectoryCategoryIds)
                    ? data.linkedDirectoryCategoryIds
                    : [],
                  subcategories: Array.isArray(data.subcategories)
                    ? data.subcategories.map((s: any) => ({
                        key: s.id,
                        label: s.label,
                        icon: s.icon || 'ellipse-outline',
                        imageUrl: s.imageUrl || null,
                      }))
                    : [],
                });
              }
            });

            cachedServiceCategories = loaded;
            serviceCategoryListeners.forEach((fn) => fn(cachedServiceCategories));
          }
        },
        (err) => {
          console.warn('[serviceTaxonomyService] Subscription error, using fallback:', err);
        }
      );
    } catch (e) {
      console.warn('[serviceTaxonomyService] Init error, using fallback:', e);
    }
  }

  return () => {
    if (onUpdate) {
      serviceCategoryListeners = serviceCategoryListeners.filter((fn) => fn !== onUpdate);
    }
  };
}

/**
 * Find which Service Category IDs map to a given Directory Category slug
 */
export function getServiceCategoryIdsForDirectoryCategory(dirCatSlug: string): string[] {
  return cachedServiceCategories
    .filter((c) => c.linkedDirectoryCategoryIds && c.linkedDirectoryCategoryIds.includes(dirCatSlug))
    .map((c) => c.key);
}

/**
 * Find which Service Category records map to a given Directory Category slug
 */
export function getLinkedServiceCategoriesForDirectory(dirCatSlug: string): ServiceCategoryMeta[] {
  return cachedServiceCategories.filter(
    (c) => c.linkedDirectoryCategoryIds && c.linkedDirectoryCategoryIds.includes(dirCatSlug)
  );
}

/**
 * Get category metadata for a service category key
 */
export function getServiceCategoryMeta(key: string): ServiceCategoryMeta | undefined {
  return cachedServiceCategories.find((c) => c.key === key);
}
