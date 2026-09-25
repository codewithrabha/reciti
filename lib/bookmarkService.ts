import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { BookmarkItemType, BookmarkableItem, UserBookmark } from '@/types';

/**
 * Saves an item (directory, housing, event) into user's private bookmarks subcollection.
 * Path: users/{userId}/bookmarks/{targetId}
 */
export async function saveBookmark(
  userId: string,
  item: BookmarkableItem
): Promise<UserBookmark> {
  const bookmarkRef = doc(db, 'users', userId, 'bookmarks', item.targetId);

  const bookmarkData: UserBookmark = {
    id: item.targetId,
    targetId: item.targetId,
    itemType: item.itemType,
    title: item.title,
    subtitle: item.subtitle || '',
    category: item.category || '',
    imageUrl: item.imageUrl || '',
    address: item.address || '',
    city: item.city || '',
    extraMeta: item.extraMeta || {},
    savedAt: Date.now(),
  };

  await setDoc(bookmarkRef, bookmarkData);
  return bookmarkData;
}

/**
 * Removes a bookmark by targetId from user's private bookmarks subcollection.
 */
export async function removeBookmark(
  userId: string,
  targetId: string
): Promise<void> {
  const bookmarkRef = doc(db, 'users', userId, 'bookmarks', targetId);
  await deleteDoc(bookmarkRef);
}

/**
 * Checks if a specific item is bookmarked by the user.
 */
export async function isItemBookmarked(
  userId: string,
  targetId: string
): Promise<boolean> {
  const bookmarkRef = doc(db, 'users', userId, 'bookmarks', targetId);
  const snap = await getDoc(bookmarkRef);
  return snap.exists();
}

/**
 * Fetches all bookmarked target IDs for fast O(1) in-memory lookups.
 */
export async function getUserBookmarkedIdMap(
  userId: string
): Promise<Record<string, boolean>> {
  try {
    const colRef = collection(db, 'users', userId, 'bookmarks');
    const snapshot = await getDocs(colRef);
    const map: Record<string, boolean> = {};
    snapshot.forEach((d) => {
      map[d.id] = true;
    });
    return map;
  } catch (err) {
    console.warn('[bookmarkService] Failed to load bookmarked IDs:', err);
    return {};
  }
}

/**
 * Fetches the user's bookmarks list ordered by most recently saved.
 * Supports optional category filtering (e.g. 'directory', 'housing', 'event').
 */
export async function getUserBookmarks(
  userId: string,
  filterType?: 'all' | BookmarkItemType,
  maxLimit = 50
): Promise<UserBookmark[]> {
  try {
    const colRef = collection(db, 'users', userId, 'bookmarks');
    let q = query(colRef, orderBy('savedAt', 'desc'), limit(maxLimit));

    if (filterType && filterType !== 'all') {
      q = query(
        colRef,
        where('itemType', '==', filterType),
        orderBy('savedAt', 'desc'),
        limit(maxLimit)
      );
    }

    const snapshot = await getDocs(q);
    const list: UserBookmark[] = [];
    snapshot.forEach((d) => {
      list.push(d.data() as UserBookmark);
    });
    return list;
  } catch (err) {
    console.error('[bookmarkService] Failed to get user bookmarks:', err);
    return [];
  }
}
