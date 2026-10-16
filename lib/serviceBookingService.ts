import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { ServiceItem, ServiceBooking, BookingStatus } from '@/types';

const SERVICES_COLLECTION = 'services';
const BOOKINGS_COLLECTION = 'bookings';

/**
 * Normalizes a raw Firestore document into a typed ServiceItem
 */
function toServiceItem(id: string, data: any): ServiceItem {
  return {
    id,
    title: data.title || '',
    description: data.description || '',
    providerUserId: data.providerUserId || '',
    providerName: data.providerName || 'Provider',
    providerPhone: data.providerPhone,
    providerAvatar: data.providerAvatar,
    directoryId: data.directoryId,
    categoryId: data.categoryId,
    subcategoryId: data.subcategoryId,
    linkedCategoryIds: Array.isArray(data.linkedCategoryIds) ? data.linkedCategoryIds : [],
    linkedSubcategoryIds: Array.isArray(data.linkedSubcategoryIds) ? data.linkedSubcategoryIds : [],
    price: typeof data.price === 'number' ? data.price : 0,
    priceType: data.priceType || 'fixed',
    durationMinutes: data.durationMinutes,
    badgeText: data.badgeText,
    imageUrl: data.imageUrl,
    availableDays: data.availableDays,
    timeSlots: Array.isArray(data.timeSlots) && data.timeSlots.length > 0
      ? data.timeSlots
      : ['09:00 AM', '10:30 AM', '12:00 PM', '02:30 PM', '04:00 PM', '05:30 PM'],
    city: data.city || null,
    order: typeof data.order === 'number' ? data.order : 0,
    isActive: data.isActive !== false,
    createdAt: data.createdAt || Timestamp.now(),
    updatedAt: data.updatedAt,
  };
}

/**
 * Normalizes a raw Firestore document into a typed ServiceBooking
 */
function toServiceBooking(id: string, data: any): ServiceBooking {
  return {
    id,
    serviceId: data.serviceId || '',
    serviceTitle: data.serviceTitle || '',
    categorySlug: data.categorySlug,
    providerUserId: data.providerUserId || '',
    providerName: data.providerName || '',
    providerPhone: data.providerPhone,
    directoryId: data.directoryId,
    userId: data.userId || '',
    userName: data.userName || '',
    userPhone: data.userPhone || '',
    userEmail: data.userEmail,
    bookingDate: data.bookingDate || '',
    timeSlot: data.timeSlot || '',
    totalPrice: typeof data.totalPrice === 'number' ? data.totalPrice : 0,
    notes: data.notes,
    status: (data.status as BookingStatus) || 'pending',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

/**
 * Fetch active services dynamically linked to a specific directory category slug.
 * Zero mobile deploy: When admin links/unlinks categories, this query reflects it immediately.
 */
export async function getLinkedServicesForCategory(
  categorySlug: string,
  cityName?: string
): Promise<ServiceItem[]> {
  try {
    const q = query(
      collection(db, SERVICES_COLLECTION),
      where('linkedCategoryIds', 'array-contains', categorySlug),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(q);
    const services: ServiceItem[] = [];

    snapshot.forEach((docSnap) => {
      const item = toServiceItem(docSnap.id, docSnap.data());
      // City filter: Include if service has no specific city (available everywhere)
      // or if it matches user's current city
      if (!item.city || !cityName || item.city.toLowerCase() === cityName.toLowerCase()) {
        services.push(item);
      }
    });

    // Sort by order ascending
    services.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return services;
  } catch (error) {
    console.warn('[serviceBookingService] getLinkedServicesForCategory error:', error);
    return [];
  }
}

/**
 * Real-time subscription to services linked to a category.
 * Updates instantly when an admin links/unlinks a service from the category.
 */
export function subscribeLinkedServicesForCategory(
  categorySlug: string,
  callback: (services: ServiceItem[]) => void,
  cityName?: string
): () => void {
  const q = query(
    collection(db, SERVICES_COLLECTION),
    where('linkedCategoryIds', 'array-contains', categorySlug),
    where('isActive', '==', true)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const services: ServiceItem[] = [];
      snapshot.forEach((docSnap) => {
        const item = toServiceItem(docSnap.id, docSnap.data());
        if (!item.city || !cityName || item.city.toLowerCase() === cityName.toLowerCase()) {
          services.push(item);
        }
      });
      services.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      callback(services);
    },
    (error) => {
      console.warn('[serviceBookingService] subscribeLinkedServices error:', error);
      callback([]);
    }
  );
}

/**
 * Real-time subscription to active services under a specific Service Category ID.
 */
export function subscribeServicesByCategory(
  categoryId: string,
  callback: (services: ServiceItem[]) => void,
  cityName?: string,
  subcategoryId?: string
): () => void {
  const q = query(
    collection(db, SERVICES_COLLECTION),
    where('categoryId', '==', categoryId),
    where('isActive', '==', true)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const services: ServiceItem[] = [];
      snapshot.forEach((docSnap) => {
        const item = toServiceItem(docSnap.id, docSnap.data());
        if (subcategoryId && subcategoryId !== 'all' && item.subcategoryId !== subcategoryId) {
          return;
        }
        if (!item.city || !cityName || item.city.toLowerCase() === cityName.toLowerCase()) {
          services.push(item);
        }
      });
      services.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      callback(services);
    },
    (error) => {
      console.warn('[serviceBookingService] subscribeServicesByCategory error:', error);
      callback([]);
    }
  );
}

/**
 * Fetch a single service by ID
 */
export async function getServiceById(serviceId: string): Promise<ServiceItem | null> {
  try {
    const docRef = doc(db, SERVICES_COLLECTION, serviceId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return toServiceItem(snap.id, snap.data());
  } catch (error) {
    console.warn('[serviceBookingService] getServiceById error:', error);
    return null;
  }
}

/**
 * Create a new customer booking
 */
export async function createServiceBooking(
  data: Omit<ServiceBooking, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<string> {
  const bookingsRef = collection(db, BOOKINGS_COLLECTION);
  const newBookingDoc = doc(bookingsRef);
  const bookingId = newBookingDoc.id;

  const now = Timestamp.now();
  const bookingPayload = {
    ...data,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newBookingDoc, bookingPayload);
  return bookingId;
}

/**
 * Subscribe to the current user's customer bookings
 */
export function subscribeUserBookings(
  userId: string,
  callback: (bookings: ServiceBooking[]) => void
): () => void {
  // Query by userId only (single-field index, no composite index needed)
  const q = query(
    collection(db, BOOKINGS_COLLECTION),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ServiceBooking[] = [];
      snapshot.forEach((docSnap) => {
        list.push(toServiceBooking(docSnap.id, docSnap.data()));
      });
      // In-memory sort by createdAt descending (avoids composite index error)
      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return timeB - timeA;
      });
      callback(list);
    },
    (error) => {
      console.warn('[serviceBookingService] subscribeUserBookings error:', error);
      callback([]);
    }
  );
}

/**
 * Cancel a booking by the customer
 */
export async function cancelBooking(bookingId: string, userId: string): Promise<void> {
  const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
  const snap = await getDoc(bookingRef);
  if (!snap.exists()) {
    throw new Error('Booking not found');
  }
  const data = snap.data();
  if (data.userId !== userId) {
    throw new Error('Unauthorized to cancel this booking');
  }

  await updateDoc(bookingRef, {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Fetch all active services across the platform, optionally filtered by city
 */
export async function getAllActiveServices(cityName?: string): Promise<ServiceItem[]> {
  try {
    const q = query(
      collection(db, SERVICES_COLLECTION),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    const services: ServiceItem[] = [];
    snapshot.forEach((docSnap) => {
      const item = toServiceItem(docSnap.id, docSnap.data());
      if (!item.city || !cityName || item.city.toLowerCase() === cityName.toLowerCase()) {
        services.push(item);
      }
    });
    services.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return services;
  } catch (error) {
    console.warn('[serviceBookingService] getAllActiveServices error:', error);
    return [];
  }
}

/**
 * Real-time subscription to all active services across the platform, optionally filtered by city
 */
export function subscribeAllActiveServices(
  callback: (services: ServiceItem[]) => void,
  cityName?: string
): () => void {
  const q = query(
    collection(db, SERVICES_COLLECTION),
    where('isActive', '==', true)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const services: ServiceItem[] = [];
      snapshot.forEach((docSnap) => {
        const item = toServiceItem(docSnap.id, docSnap.data());
        if (!item.city || !cityName || item.city.toLowerCase() === cityName.toLowerCase()) {
          services.push(item);
        }
      });
      services.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      callback(services);
    },
    (error) => {
      console.warn('[serviceBookingService] subscribeAllActiveServices error:', error);
      callback([]);
    }
  );
}

