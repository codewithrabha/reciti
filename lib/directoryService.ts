import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { BusinessDirectoryItem, DirectoryCategory, ListingClaim } from '@/types';

export const DIRECTORY_CATEGORIES: { key: DirectoryCategory | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'apps-outline' },
  { key: 'shops', label: 'Shops', icon: 'bag-handle-outline' },
  { key: 'local_stores', label: 'Local Stores', icon: 'basket-outline' },
  { key: 'markets', label: 'Open Markets', icon: 'cart-outline' },
  { key: 'healthcare', label: 'Hospitals & Care', icon: 'medkit-outline' },
  { key: 'hotels', label: 'Hotels', icon: 'bed-outline' },
  { key: 'institutions', label: 'Institutions', icon: 'business-outline' },
  { key: 'services', label: 'Services', icon: 'construct-outline' },
];

export const MOCK_BUSINESSES: BusinessDirectoryItem[] = [
  {
    id: 'biz-1',
    name: 'GreenLeaf Artisan Boutique',
    category: 'shops',
    description: 'Eco-conscious handcrafted lifestyle products, upcycled clothing, and zero-waste daily home goods sourced from local regional artisans.',
    address: '42 Bloom Street, Indiranagar',
    city: 'Bongaigaon',
    latitude: 26.4586,
    longitude: 90.5591,
    phone: '+91 98450 12345',
    website: 'https://greenleafboutique.example.com',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80',
    rating: 4.8,
    reviewCount: 94,
    isVerified: true,
    isSponsored: true,
    openingHours: '10:00 AM - 9:00 PM',
    isClaimed: false,
    claimStatus: 'unclaimed',
  },
  {
    id: 'biz-2',
    name: 'Metro City Polyclinic & Diagnostics',
    category: 'healthcare',
    description: 'Full-service neighborhood diagnostic clinic with 24/7 pharmacy, emergency first-aid, general physicians, and preventive health screenings.',
    address: '108 Central Avenue, Near Metro Gate 2',
    city: 'Bengaluru',
    latitude: 12.9752,
    longitude: 77.6321,
    phone: '+91 80 4123 7890',
    website: 'https://metrocare.example.com',
    imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80',
    rating: 4.6,
    reviewCount: 142,
    isVerified: true,
    isSponsored: false,
    openingHours: 'Open 24 Hours',
    isClaimed: true,
    claimStatus: 'verified',
    ownerId: 'verified-partner-001',
  },
  {
    id: 'biz-3',
    name: 'City Guild Heritage Hotel',
    category: 'hotels',
    description: 'Boutique heritage stay with sustainable architecture, serene courtyard gardens, and rooftop conference spaces for community summits.',
    address: '14 Palace Cross Road',
    city: 'Bengaluru',
    latitude: 12.9863,
    longitude: 77.6012,
    phone: '+91 80 2234 5678',
    website: 'https://cityguildhotel.example.com',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewCount: 310,
    isVerified: true,
    isSponsored: true,
    openingHours: '24/7 Check-in',
    isClaimed: false,
    claimStatus: 'unclaimed',
  },
  {
    id: 'biz-4',
    name: 'Sunday Organic Farmers Market',
    category: 'markets',
    description: 'Direct-from-farm pesticide-free fresh produce, cold-pressed oils, native seeds, and sourdough baked goods directly from local cooperatives.',
    address: 'Public Pavilion Grounds, 5th Cross',
    city: 'Bengaluru',
    latitude: 12.9719,
    longitude: 77.6412,
    phone: '+91 97412 88990',
    website: 'https://sundayorganic.example.com',
    imageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&auto=format&fit=crop&q=80',
    rating: 4.7,
    reviewCount: 220,
    isVerified: true,
    isSponsored: false,
    openingHours: 'Sundays 7:00 AM - 1:00 PM',
    isClaimed: false,
    claimStatus: 'unclaimed',
  },
  {
    id: 'biz-5',
    name: 'Urban Fix & Tool Library',
    category: 'services',
    description: 'Community repair workshop, appliance diagnostics, bicycle servicing, and community tool rental station to reduce municipal electronic waste.',
    address: '88 Utility Lane, HAL 2nd Stage',
    city: 'Bengaluru',
    latitude: 12.9644,
    longitude: 77.6455,
    phone: '+91 99001 54321',
    website: 'https://urbanfixcommunity.example.com',
    imageUrl: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=800&auto=format&fit=crop&q=80',
    rating: 4.9,
    reviewCount: 88,
    isVerified: true,
    isSponsored: false,
    openingHours: '9:00 AM - 7:30 PM (Closed Tue)',
    isClaimed: true,
    claimStatus: 'verified',
    ownerId: 'verified-fix-002',
  },
  {
    id: 'biz-6',
    name: 'Civic Innovation & Research Institute',
    category: 'institutions',
    description: 'Non-profit urban policy think tank, public archives, and community meeting rooms supporting citizen initiatives and sustainable town planning.',
    address: '3rd Floor, Civic Tower, MG Road',
    city: 'Bengaluru',
    latitude: 12.9756,
    longitude: 77.6089,
    phone: '+91 80 6789 0000',
    website: 'https://civicinstitute.example.org',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80',
    rating: 4.5,
    reviewCount: 65,
    isVerified: true,
    isSponsored: false,
    openingHours: '9:30 AM - 6:00 PM (Mon-Fri)',
    isClaimed: false,
    claimStatus: 'unclaimed',
  },
  {
    id: 'biz-7',
    name: 'Cornerstone Provisions & General Store',
    category: 'local_stores',
    description: 'Neighborhood family-run general provisions store serving the area for over 35 years with home essentials, bulk staples, and friendly doorstep delivery.',
    address: '19 Colony Main Road',
    city: 'Bengaluru',
    latitude: 12.9733,
    longitude: 77.6391,
    phone: '+91 94480 33445',
    imageUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80',
    rating: 4.6,
    reviewCount: 110,
    isVerified: true,
    isSponsored: false,
    openingHours: '7:30 AM - 10:00 PM',
    isClaimed: false,
    claimStatus: 'unclaimed',
  },
];

const DIRECTORIES_COL = collection(db, 'directories');
const CLAIMS_COL = collection(db, 'listing_claims');

export async function getDirectoryItems(
  category?: DirectoryCategory | 'all',
  search?: string,
  city?: string
): Promise<BusinessDirectoryItem[]> {
  let items: BusinessDirectoryItem[] = [];

  try {
    const snap = await getDocs(DIRECTORIES_COL);
    if (!snap.empty) {
      items = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<BusinessDirectoryItem, 'id'>),
      }));
    }
  } catch (err) {
    console.warn('[directoryService] Firestore query error, falling back to mock data:', err);
  }

  // If collection is empty or unreachable, fall back to mock data
  if (items.length === 0) {
    items = [...MOCK_BUSINESSES];
  }

  // Filter by city
  if (city && city.trim().length > 0) {
    const c = city.trim().toLowerCase();
    items = items.filter((b) => b.city && b.city.toLowerCase() === c);
  }

  // Filter by category
  if (category && category !== 'all') {
    items = items.filter((b) => b.category === category);
  }

  // Filter by search query
  if (search && search.trim().length > 0) {
    const q = search.trim().toLowerCase();
    items = items.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        (b.city && b.city.toLowerCase().includes(q)) ||
        b.category.toLowerCase().includes(q)
    );
  }

  return items;
}

export async function getDirectoryItemById(id: string): Promise<BusinessDirectoryItem | null> {
  try {
    const docRef = doc(DIRECTORIES_COL, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return {
        id: snap.id,
        ...(snap.data() as Omit<BusinessDirectoryItem, 'id'>),
      };
    }
  } catch (err) {
    console.warn('[directoryService] Firestore get error, checking mock list:', err);
  }

  const found = MOCK_BUSINESSES.find((b) => b.id === id);
  return found ?? null;
}

/**
 * Submits an ownership claim for a business or institution listing.
 * Stored in `/listing_claims` for administrative review.
 */
export async function submitListingClaim(
  claimData: {
    listingId: string;
    listingName: string;
    claimantUid: string;
    claimantName?: string;
    claimantEmail?: string;
    claimantPhone?: string;
    businessProofUrl?: string | null;
    notes?: string;
  }
): Promise<{ success: boolean; claimId?: string; error?: string }> {
  try {
    const claimDocRef = doc(CLAIMS_COL);
    const claimId = claimDocRef.id;

    const newClaim: ListingClaim = {
      claimId,
      listingId: claimData.listingId,
      listingName: claimData.listingName,
      claimantUid: claimData.claimantUid,
      claimantName: claimData.claimantName ?? '',
      claimantEmail: claimData.claimantEmail ?? '',
      claimantPhone: claimData.claimantPhone ?? '',
      businessProofUrl: claimData.businessProofUrl ?? null,
      notes: claimData.notes ?? '',
      status: 'pending',
      createdAt: Timestamp.now(),
      reviewedAt: null,
      reviewedBy: null,
    };

    await setDoc(claimDocRef, newClaim);
    return { success: true, claimId };
  } catch (err: any) {
    console.error('[directoryService] submitListingClaim error:', err);
    return { success: false, error: err?.message ?? 'Failed to submit claim' };
  }
}

/**
 * Checks if the current user already submitted a pending claim for this listing.
 */
export async function getUserListingClaim(
  listingId: string,
  claimantUid: string
): Promise<ListingClaim | null> {
  try {
    const q = query(
      CLAIMS_COL,
      where('listingId', '==', listingId),
      where('claimantUid', '==', claimantUid)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as ListingClaim;
    }
  } catch (err) {
    console.warn('[directoryService] getUserListingClaim error:', err);
  }
  return null;
}

/**
 * Registers a new business or institution listing created by a verified merchant/owner.
 */
export async function createDirectoryItem(
  item: Omit<BusinessDirectoryItem, 'id'>,
  ownerUid?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const dirDocRef = doc(DIRECTORIES_COL);
    const payload: BusinessDirectoryItem = {
      ...item,
      id: dirDocRef.id,
      ownerId: ownerUid ?? null,
      isClaimed: Boolean(ownerUid),
      claimStatus: ownerUid ? 'verified' : 'unclaimed',
      claimedAt: ownerUid ? Timestamp.now() : null,
    };

    await setDoc(dirDocRef, payload);
    return { success: true, id: dirDocRef.id };
  } catch (err: any) {
    console.error('[directoryService] createDirectoryItem error:', err);
    return { success: false, error: err?.message ?? 'Failed to create listing' };
  }
}
