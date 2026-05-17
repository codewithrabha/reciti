---
name: reciti-auth
description: >-
  Use when working on authentication in the ReCiti app — anonymous browsing,
  email sign-up/sign-in, Google Sign-In, account linking, or the useAuth hook.
---

# ReCiti — Authentication

Auth uses the **Firebase JS SDK** (`firebase/auth`). All auth logic lives in
[`lib/auth.ts`](../../../lib/auth.ts); React state is exposed by
[`hooks/useAuth.tsx`](../../../hooks/useAuth.tsx).

## The `useAuth()` hook

```tsx
const { user, userDoc, loading, refreshUserDoc } = useAuth();
```

- `user` — the Firebase auth user (`FirebaseUser`): has `uid`, `isAnonymous`, `displayName`…
- `userDoc` — the Firestore `users/{uid}` document (`civicPoints`, `tier`, …).
  **Only populated for non-anonymous users.**
- `loading` — true until the first `onAuthStateChanged` resolves.

## Account model — three states

1. **Anonymous** — on first launch the app auto-calls `signInAnonymously`. Anonymous
   users can *browse only*: no `users/` doc, no civic points, **cannot submit reports**
   (gated in `capture.tsx`). An anonymous account owns **no data** — it is safe to abandon.
2. **Email/password** — `signUpWithEmail` / `signInWithEmail`.
3. **Google** — `signInWithGoogle` (`@react-native-google-signin/google-signin` + Firebase credential).

## Account linking (important pattern)

When a signed-out (anonymous) user signs up, the code **upgrades the anonymous
account in place** with `linkWithCredential`, so the same `uid` is kept.

For Google sign-in, linking can fail with **`auth/credential-already-in-use`** —
that Google account already has its own Firebase user. The handler catches that
error and falls back to `signInWithCredential` (signs into the existing account).
The anonymous account is discarded — fine, since anonymous accounts own no data.
**Preserve this try/catch fallback** when editing `signInWithGoogle`.

## Google Sign-In configuration

- `GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID })`
  runs once at module load in `lib/auth.ts`.
- `webClientId` **must be the *Web* OAuth client** (type 3) from `google-services.json`,
  not the Android client.
- `EXPO_PUBLIC_*` env vars are **inlined into the JS bundle at build time**. After
  editing `.env`, restart Metro with `npx expo start -c` or the value stays stale/undefined.

## Common errors

- **`DEVELOPER_ERROR`** on Google sign-in → native config mismatch (SHA-1 / package /
  client ID). This is a *build* problem — see the `reciti-android-build` skill.
- **`auth/credential-already-in-use`** → expected; handled by the fallback above.
- **`No ID token returned`** → `webClientId` missing/undefined or Metro cache stale.

## Firestore user docs

`createOrUpdateUserDoc` (in `lib/db.ts`) is called from `useAuth` for non-anonymous
users and after sign-in flows. New docs start at `civicPoints: 0`, `tier: 'Tourist'`.
