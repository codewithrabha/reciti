/**
 * Compatibility shim over the zustand auth store (`@/store/authStore`).
 *
 * Auth state now lives in zustand, not React Context. Prefer the granular
 * selector hooks — `useUser`, `useUserDoc`, `useRefreshUserDoc` — in new code:
 * they re-render a component only when the exact slice it reads changes.
 *
 * `useAuth()` is kept for convenience but reads every slice, so a component
 * using it re-renders on any auth change. Re-exported here so existing
 * `@/hooks/useAuth` imports keep working.
 */
import {
  useAuthLoading,
  useRefreshUserDoc,
  useUser,
  useUserDoc,
} from '@/store/authStore';

export { useUser, useUserDoc, useAuthLoading, useRefreshUserDoc } from '@/store/authStore';

export const useAuth = () => ({
  user: useUser(),
  userDoc: useUserDoc(),
  loading: useAuthLoading(),
  refreshUserDoc: useRefreshUserDoc(),
});
