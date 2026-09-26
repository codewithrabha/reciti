import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { BusinessDirectoryItem, DirectoryCategory, DirectorySubcategory, ListingClaim } from '@/types';

export interface SubcategoryMeta {
  key: DirectorySubcategory;
  label: string;
  icon: string;
}

export interface CategoryMeta {
  key: DirectoryCategory | 'all';
  label: string;
  icon: string;
  subcategories: SubcategoryMeta[];
}

let dynamicSectors: CategoryMeta[] = [
  {
    key: 'all',
    label: 'All',
    icon: 'apps-outline',
    subcategories: [],
  },
];

let dynamicCategoriesSubscribed = false;
let categoryListeners: Array<(sectors: CategoryMeta[]) => void> = [];

export function subscribeDynamicCategories(
  onUpdate?: (sectors: CategoryMeta[]) => void
): () => void {
  if (onUpdate) {
    categoryListeners.push(onUpdate);
    if (dynamicSectors.length > 1) {
      onUpdate(dynamicSectors);
    }
  }

  if (!dynamicCategoriesSubscribed) {
    dynamicCategoriesSubscribed = true;
    try {
      const q = query(collection(db, 'directory_categories'), orderBy('order', 'asc'));
      onSnapshot(
        q,
        (snap) => {
          if (!snap.empty) {
            const loaded: CategoryMeta[] = [
              { key: 'all', label: 'All', icon: 'apps-outline', subcategories: [] },
            ];
            snap.docs.forEach((docSnap) => {
              const data = docSnap.data();
              if (data.isActive !== false) {
                loaded.push({
                  key: (data.id || docSnap.id) as DirectoryCategory,
                  label: data.label || docSnap.id,
                  icon: data.icon || 'grid-outline',
                  subcategories: (data.subcategories || [])
                    .filter((s: any) => s.isActive !== false)
                    .map((s: any) => ({
                      key: s.id as DirectorySubcategory,
                      label: s.label,
                      icon: s.icon || 'apps-outline',
                    })),
                });
              }
            });
            dynamicSectors = loaded;
            categoryListeners.forEach((fn) => fn(dynamicSectors));
          }
        },
        (err) => {
          console.warn('[directoryService] subscribeDynamicCategories error:', err);
        }
      );
    } catch (err) {
      console.warn('[directoryService] Failed to set up dynamic categories listener:', err);
    }
  }

  return () => {
    if (onUpdate) {
      categoryListeners = categoryListeners.filter((fn) => fn !== onUpdate);
    }
  };
}

// Auto-start listener on module load
subscribeDynamicCategories();

export function getDirectoryCategories(): { key: DirectoryCategory | 'all'; label: string; icon: string }[] {
  return dynamicSectors.map((s) => ({
    key: s.key,
    label: s.label,
    icon: s.icon,
  }));
}

export const DIRECTORY_CATEGORIES: { key: DirectoryCategory | 'all'; label: string; icon: string }[] =
  getDirectoryCategories();

export const LEGACY_CATEGORY_MAP: Record<string, { category: DirectoryCategory; subcategory?: DirectorySubcategory }> = {
  shops: { category: 'shopping_retail', subcategory: 'grocery_essentials' },
  local_stores: { category: 'shopping_retail', subcategory: 'grocery_essentials' },
  markets: { category: 'shopping_retail', subcategory: 'grocery_essentials' },
  hotels: { category: 'accommodation', subcategory: 'hotels_resorts' },
  institutions: { category: 'education', subcategory: 'schools_colleges' },
  services: { category: 'public_services', subcategory: 'general_services' },
  healthcare: { category: 'healthcare', subcategory: 'clinics_doctors' },
  other: { category: 'other', subcategory: 'general_services' },
};

/**
 * Normalizes legacy category values to the new taxonomy.
 */
export function normalizeCategory(category: string): DirectoryCategory {
  if (LEGACY_CATEGORY_MAP[category]) {
    return LEGACY_CATEGORY_MAP[category].category;
  }
  return category as DirectoryCategory;
}

/**
 * Returns human-friendly label for any category key (including dynamic & legacy keys).
 */
export function getCategoryLabel(category: string): string {
  const dynamic = dynamicSectors.find((s) => s.key === category);
  if (dynamic) return dynamic.label;
  const legacy = LEGACY_CATEGORY_MAP[category];
  if (legacy) {
    const parent = dynamicSectors.find((s) => s.key === legacy.category);
    if (parent) return parent.label;
  }
  return category.replace(/_/g, ' ').toUpperCase();
}

/**
 * Returns human-friendly label for any subcategory key.
 */
export function getSubcategoryLabel(subcat?: string | null): string | null {
  if (!subcat) return null;
  for (const sector of dynamicSectors) {
    const found = sector.subcategories.find((s) => s.key === subcat);
    if (found) return found.label;
  }
  return subcat.replace(/_/g, ' ');
}

/**
 * Returns the subcategories configured for a primary category.
 */
export function getSubcategoriesForCategory(category: DirectoryCategory | 'all'): SubcategoryMeta[] {
  if (category === 'all') return [];
  const normalized = normalizeCategory(category);
  const sector = dynamicSectors.find((s) => s.key === normalized);
  return sector ? sector.subcategories : [];
}

/**
 * React hook to observe dynamic subcategories for a given category.
 * Features zero layout shift: synchronously initializes with cached/fallback subcategories,
 * and updates seamlessly when Firestore's directory_categories updates.
 */
export function useCategorySubcategories(category: DirectoryCategory = 'housing_rentals'): SubcategoryMeta[] {
  const [subcategories, setSubcategories] = useState<SubcategoryMeta[]>(() =>
    getSubcategoriesForCategory(category)
  );

  useEffect(() => {
    setSubcategories(getSubcategoriesForCategory(category));

    const unsubscribe = subscribeDynamicCategories((sectors) => {
      const parent = sectors.find((s) => s.key === category);
      if (parent && parent.subcategories) {
        setSubcategories(parent.subcategories);
      }
    });

    return () => unsubscribe();
  }, [category]);

  return subcategories;
}

const DIRECTORIES_COL = collection(db, 'directories');
const CLAIMS_COL = collection(db, 'listing_claims');

export async function getDirectoryItems(
  category?: DirectoryCategory | 'all',
  search?: string,
  city?: string,
  subcategory?: DirectorySubcategory | 'all'
): Promise<BusinessDirectoryItem[]> {
  let items: BusinessDirectoryItem[] = [];

  try {
    const snap = await getDocs(DIRECTORIES_COL);
    if (!snap.empty) {
      items = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<BusinessDirectoryItem, 'id'>),
      }));

      // Filter out pending community submissions or rejected listings from public view
      items = items.filter((b) => !b.status || b.status === 'active');
    }
  } catch (err) {
    console.warn('[directoryService] Firestore query error:', err);
  }

  // Filter by city
  if (city && city.trim().length > 0) {
    const c = city.trim().toLowerCase();
    items = items.filter((b) => b.city && b.city.toLowerCase() === c);
  }

  // Filter by category (with legacy category normalization)
  if (category && category !== 'all') {
    items = items.filter((b) => {
      const normalized = normalizeCategory(b.category);
      return b.category === category || normalized === category;
    });
  }

  // Filter by subcategory
  if (subcategory && subcategory !== 'all') {
    items = items.filter((b) => {
      if (b.subcategory) {
        return b.subcategory === subcategory;
      }
      const legacySub = LEGACY_CATEGORY_MAP[b.category]?.subcategory;
      return legacySub === subcategory;
    });
  }

  // Filter by search query
  if (search && search.trim().length > 0) {
    const q = search.trim().toLowerCase();
    items = items.filter((b) => {
      const catLabel = getCategoryLabel(b.category).toLowerCase();
      const subLabel = (b.subcategory ? getSubcategoryLabel(b.subcategory) ?? '' : '').toLowerCase();
      return (
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q) ||
        (b.city && b.city.toLowerCase().includes(q)) ||
        b.category.toLowerCase().includes(q) ||
        (b.subcategory && b.subcategory.toLowerCase().includes(q)) ||
        catLabel.includes(q) ||
        subLabel.includes(q)
      );
    });
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

/**
 * Fetches all directories/properties where the user is the verified owner.
 */
export async function getUserOwnedListings(ownerUid: string): Promise<BusinessDirectoryItem[]> {
  try {
    const q = query(DIRECTORIES_COL, where('ownerId', '==', ownerUid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<BusinessDirectoryItem, 'id'>),
    }));
  } catch (err) {
    console.warn('[directoryService] getUserOwnedListings error:', err);
    return [];
  }
}

/**
 * Fetches all listing ownership claims submitted by the user.
 */
export async function getUserClaims(claimantUid: string): Promise<ListingClaim[]> {
  try {
    const q = query(CLAIMS_COL, where('claimantUid', '==', claimantUid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ListingClaim);
  } catch (err) {
    console.warn('[directoryService] getUserClaims error:', err);
    return [];
  }
}
