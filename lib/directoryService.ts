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
    console.warn('[directoryService] Firestore query error:', err);
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
    console.warn('[directoryService] Firestore get error:', err);
  }

  return null;
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
