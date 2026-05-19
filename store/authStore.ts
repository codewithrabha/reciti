import { create } from 'zustand';
import { User as FirebaseUser, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createOrUpdateUserDoc, getUserDoc } from '@/lib/db';
import { User } from '@/types';

/**
 * Global auth state.
 *
 * Replaces the old React Context `AuthProvider`. With a context, every screen
 * calling `useAuth()` re-rendered whenever *any* auth field changed. Here each
 * screen subscribes to only the slice it reads (see the selector hooks below),
 * so a `userDoc` refresh no longer re-renders screens that only need `user`.
 */
interface AuthState {
  /** Firebase auth user — has `.isAnonymous`, `.uid`, etc. `null` until resolved. */
  user: FirebaseUser | null;
  /** Firestore user document — civic points, tier, etc. `null` for guests. */
  userDoc: User | null;
  /** True until the first `onAuthStateChanged` callback resolves. */
  loading: boolean;
  /** Re-fetches the current user's Firestore document into the store. */
  refreshUserDoc: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userDoc: null,
  loading: true,
  refreshUserDoc: async () => {
    const { user } = get();
    if (!user) return;
    const doc = await getUserDoc(user.uid);
    set({ userDoc: doc });
  },
}));

let started = false;

/**
 * Starts the single app-lifetime Firebase auth listener and mirrors it into the
 * store. Idempotent — safe to call from a `useEffect` and across Fast Refresh.
 */
export function initAuthListener(): void {
  if (started) return;
  started = true;

  onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser) {
      useAuthStore.setState({ user: currentUser });
      if (!currentUser.isAnonymous) {
        // Ensure a user doc exists for real accounts, then load it.
        await createOrUpdateUserDoc(currentUser.uid, {
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
        });
        const doc = await getUserDoc(currentUser.uid);
        useAuthStore.setState({ userDoc: doc });
      } else {
        // Guests have no Firestore doc — clear any doc left over from a
        // previous signed-in session (e.g. after sign-out → anonymous).
        useAuthStore.setState({ userDoc: null });
      }
      useAuthStore.setState({ loading: false });
    } else {
      // No session — sign in anonymously so browsing-only users can still read.
      useAuthStore.setState({ userDoc: null });
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error('Anonymous sign in error:', error);
      }
      useAuthStore.setState({ loading: false });
    }
  });
}

// ─── Selector hooks ──────────────────────────────────────────────────────────
// Prefer these over `useAuth()` — a component re-renders only when the exact
// slice it reads changes.

/** The Firebase auth user (or `null`). */
export const useUser = () => useAuthStore((s) => s.user);

/** The Firestore user document (or `null` for guests). */
export const useUserDoc = () => useAuthStore((s) => s.userDoc);

/** True until auth state has resolved for the first time. */
export const useAuthLoading = () => useAuthStore((s) => s.loading);

/** Stable action that re-fetches the user's Firestore document. */
export const useRefreshUserDoc = () => useAuthStore((s) => s.refreshUserDoc);
