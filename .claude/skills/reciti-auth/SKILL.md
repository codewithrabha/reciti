---
name: reciti-auth
description: >-
  Use when working on authentication in the ReCiti app — anonymous browsing,
  email sign-up/sign-in, Google Sign-In, account linking, the Zustand auth
  store, or push notification registration.
---

# ReCiti — Authentication

Auth uses the **Firebase JS SDK** (`firebase/auth`). All auth logic lives in
[`lib/auth.ts`](../../../lib/auth.ts); global reactive state is managed by a
**Zustand store** in [`store/authStore.ts`](../../../store/authStore.ts).

## Auth Store (Zustand) — replaces old Context

The auth store replaced the old `AuthProvider` context to avoid unnecessary
re-renders. Each screen subscribes to only the slice it needs:

```tsx
import { useUser, useUserDoc, useAuthLoading, useRefreshUserDoc } from '@/store/authStore';

const user = useUser();          // Firebase auth user (or null)
const userDoc = useUserDoc();    // Firestore User doc (or null for guests)
const loading = useAuthLoading(); // true until first auth state resolved
const refresh = useRefreshUserDoc(); // re-fetches Firestore doc
```

### Initialization
`initAuthListener()` is called once in `app/_layout.tsx`. It:
1. Listens to `onAuthStateChanged`
2. For real accounts: creates/updates Firestore user doc, loads `userDoc`, registers push token, syncs bookmark IDs
3. For no session: auto-signs in anonymously
4. Sets `loading: false` after first resolution

> ⚠️ **Do NOT use the old `useAuth()` hook from `hooks/useAuth.tsx`** — it is a
> legacy wrapper. Always use the selector hooks above.

## Account Model — Three States

1. **Anonymous** — auto-created on first launch via `signInAnonymously`. Can browse only:
   no Firestore user doc, no civic points, cannot submit reports or comments.
   Anonymous accounts own **no data** and are safe to abandon.
2. **Email/password** — `signUpWithEmail` / `signInWithEmail` in `lib/auth.ts`
3. **Google** — `signInWithGoogle` using `@react-native-google-signin/google-signin` + Firebase credential

## Account Linking (critical pattern)

When an anonymous user signs up, the code **upgrades the anonymous account in
place** with `linkWithCredential`, preserving the same `uid`.

For Google sign-in, linking can fail with **`auth/credential-already-in-use`** —
that Google account already has its own Firebase user. The handler catches that
error and falls back to `signInWithCredential` (signs into the existing account).
The anonymous account is discarded — safe since anonymous accounts own no data.

**Preserve this try/catch fallback** when editing `signInWithGoogle`.

## Google Sign-In Configuration

- `GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID })` runs at module load in `lib/auth.ts`
- `webClientId` **must be the Web OAuth client** (type 3) from `google-services.json`, not the Android client
- `EXPO_PUBLIC_*` vars are inlined at build time. After editing `.env`, restart Metro with `npx expo start -c`

## Side Effects on Auth State Change

The `onAuthStateChanged` handler in `authStore.ts` also triggers:
- `registerForPushNotificationsAsync(uid)` — registers Expo push token
- `useBookmarkStore.getState().syncBookmarkedIds(uid)` — loads bookmark ID map for O(1) checks
- Clears `userDoc` and bookmarks on sign-out → anonymous transition

## Common Errors

- **`DEVELOPER_ERROR`** on Google sign-in → native config mismatch (SHA-1 / package / client ID). See `reciti-android-build` skill.
- **`auth/credential-already-in-use`** → expected; handled by the fallback above
- **`No ID token returned`** → `webClientId` missing/undefined or Metro cache stale

## Firestore User Docs

`createOrUpdateUserDoc` (in `lib/db.ts`) is called from the auth store for
non-anonymous users and after sign-in flows. New docs start at:
```typescript
{ civicPoints: 0, tier: 'Tourist', completedDailyTrivia: {} }
```
