import { create } from 'zustand';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import { BookmarkItemType, BookmarkableItem, UserBookmark } from '@/types';
import {
  getUserBookmarkedIdMap,
  getUserBookmarks,
  removeBookmark,
  saveBookmark,
} from '@/lib/bookmarkService';

interface BookmarkState {
  /** Map of targetId -> true for instant O(1) existence checks */
  bookmarkedIds: Record<string, boolean>;
  /** Cached array of saved bookmarks for display in Saved hub */
  savedItems: UserBookmark[];
  /** Loading state for bookmarks list */
  isLoading: boolean;
  /** Active filter in Saved hub */
  activeFilter: 'all' | BookmarkItemType;

  /** O(1) query helper */
  isBookmarked: (targetId: string) => boolean;

  /** Optimistic toggle with haptic feedback & background Firestore sync */
  toggleBookmark: (
    item: BookmarkableItem,
    userId: string | undefined | null
  ) => Promise<boolean>;

  /** Load saved bookmark items from Firestore */
  loadSavedItems: (
    userId: string,
    filter?: 'all' | BookmarkItemType
  ) => Promise<void>;

  /** Sync bookmarked IDs map into store on login */
  syncBookmarkedIds: (userId: string) => Promise<void>;

  /** Set filter category */
  setActiveFilter: (filter: 'all' | BookmarkItemType) => void;
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarkedIds: {},
  savedItems: [],
  isLoading: false,
  activeFilter: 'all',

  isBookmarked: (targetId: string) => {
    return Boolean(get().bookmarkedIds[targetId]);
  },

  toggleBookmark: async (item, userId) => {
    if (!userId) {
      Alert.alert(
        'Sign in Required',
        'Please sign in to save your favorite spots, rentals, and events.'
      );
      return false;
    }

    const currentMap = { ...get().bookmarkedIds };
    const currentSaved = [...get().savedItems];
    const wasBookmarked = Boolean(currentMap[item.targetId]);
    const nextState = !wasBookmarked;

    // 1. Instant Haptic Feedback
    try {
      Haptics.impactAsync(
        nextState
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      );
    } catch {
      // ignore haptics failure on web/simulator
    }

    // 2. Optimistic UI update in store (< 1ms)
    if (nextState) {
      currentMap[item.targetId] = true;
      const optimisticDoc: UserBookmark = {
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
      set({
        bookmarkedIds: currentMap,
        savedItems: [optimisticDoc, ...currentSaved],
      });
    } else {
      delete currentMap[item.targetId];
      set({
        bookmarkedIds: currentMap,
        savedItems: currentSaved.filter((b) => b.targetId !== item.targetId),
      });
    }

    // 3. Background Firestore write
    try {
      if (nextState) {
        await saveBookmark(userId, item);
      } else {
        await removeBookmark(userId, item.targetId);
      }
      return nextState;
    } catch (err: any) {
      console.error('[bookmarkStore] Toggle failed, rolling back:', err);
      // Rollback on network failure
      const rollbackMap = { ...get().bookmarkedIds };
      if (wasBookmarked) {
        rollbackMap[item.targetId] = true;
      } else {
        delete rollbackMap[item.targetId];
      }
      set({ bookmarkedIds: rollbackMap, savedItems: currentSaved });
      Alert.alert('Bookmark Error', 'Failed to update saved item. Please try again.');
      return wasBookmarked;
    }
  },

  loadSavedItems: async (userId, filter) => {
    if (!userId) return;
    const targetFilter = filter !== undefined ? filter : get().activeFilter;
    set({ isLoading: true, activeFilter: targetFilter });
    try {
      const items = await getUserBookmarks(userId, targetFilter);
      set({ savedItems: items, isLoading: false });
    } catch (err) {
      console.error('[bookmarkStore] loadSavedItems error:', err);
      set({ isLoading: false });
    }
  },

  syncBookmarkedIds: async (userId) => {
    if (!userId) {
      set({ bookmarkedIds: {}, savedItems: [] });
      return;
    }
    const map = await getUserBookmarkedIdMap(userId);
    set({ bookmarkedIds: map });
  },

  setActiveFilter: (filter) => {
    set({ activeFilter: filter });
  },
}));
