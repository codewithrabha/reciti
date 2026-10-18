---
name: reciti-architecture
description: >-
  Use when you need the full architectural overview of the ReCiti app —
  the tech stack, project structure, Zustand state management, Firestore
  schema, feature map, and cross-cutting patterns. Read this first before
  implementing any new feature.
---

# ReCiti — Architecture Overview

ReCiti is an **all-in-one civic intelligence, zero-broker community housing, and
hyperlocal discovery platform** built as a React Native / Expo mobile app with a
Firebase backend and a Next.js admin console.

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | React Native 0.85, Expo SDK 56 (Hermes v1, New Architecture enabled) |
| **Routing** | Expo Router (file-based, typed routes, decoupled navigation) |
| **State** | Zustand 5 (global stores) + React state (local) |
| **Backend** | Firebase: Firestore, Authentication, Cloud Messaging |
| **Native Firebase** | `@react-native-firebase/app` + `@react-native-firebase/remote-config` |
| **Auth Providers** | Anonymous, Email/Password, Google Sign-In |
| **Media CDN** | Cloudinary (unsigned uploads) |
| **Images** | `expo-image` (NOT React Native Image) |
| **Camera** | `expo-camera`, `expo-image-picker`, `expo-image-manipulator` |
| **Location** | `expo-location`, `geofire-common` |
| **Push** | `expo-notifications`, Firebase Cloud Messaging |
| **Lists** | `@legendapp/list` (LegendList) for 60 FPS virtualization |
| **Animation** | React Native Reanimated 4, `expo-haptics` |
| **UI Effects** | `expo-blur` (glassmorphism), `expo-linear-gradient` |
| **Typography** | Plus Jakarta Sans (Google Fonts) |
| **Admin** | Next.js 16, TailwindCSS (separate `/admin` workspace) |

## Project Structure

```
reciti/
├── app/                    # Expo Router — all screens & navigation
│   ├── _layout.tsx         # Root Stack: fonts, auth listener, onboarding guard
│   ├── (tabs)/             # Bottom tab navigator (5 visible + routes)
│   │   ├── _layout.tsx     # Tab config with emerald FAB capture button
│   │   ├── index.tsx       # Home (Pulse dashboard, stats, notice board)
│   │   ├── directories.tsx # Directory listing with categories & search
│   │   ├── capture.tsx     # Civic report submission (1-3 photos)
│   │   ├── services.tsx    # Hyperlocal civic & urban services
│   │   ├── store.tsx       # Civic rewards & community store
│   │   ├── events.tsx      # (route) Community events feed
│   │   ├── profile.tsx     # (route) User profile, karma, leaderboard, bookmarks
│   │   └── explore.tsx     # (route) Full report feed
│   ├── auth/               # Login / signup screens
│   ├── report/             # [id] detail + index
│   ├── directories/        # [id] detail, category/[slug], contribute
│   ├── events/             # [id] detail
│   ├── notifications.tsx   # In-app notification inbox
│   ├── onboarding.tsx      # First-launch onboarding
│   ├── settings.tsx        # App settings, feedback, account management
│   └── ...                 # tiers, about, privacy-policy, terms
│
├── components/             # Reusable UI — organized by domain
│   ├── ui/                 # Design system primitives (Typography, Card, Badge, etc.)
│   ├── home/               # Pulse dashboard components
│   ├── pulse/              # Broadcast banners, civic feed
│   ├── directories/        # Directory cards & strips
│   ├── housing/            # Zero-broker cards, unlock modals
│   ├── events/             # Event cards, category filters
│   ├── explore/            # Report feed components
│   ├── reviews/            # Rating breakdown, review composer
│   ├── profile/            # Karma cards, VIP modals
│   ├── report/             # Report detail sections
│   ├── learn/              # Trivia components
│   ├── notifications/      # Notification items
│   ├── onboarding/         # Onboarding slides
│   ├── settings/           # Settings sections
│   ├── auth/               # Auth form components
│   └── skeletons/          # Loading skeleton variants
│
├── lib/                    # Service layer — ALL Firestore/external access
│   ├── firebase.ts         # Firebase app + Firestore + Auth initialization
│   ├── db.ts               # Reports, users, trivia, comments, notifications
│   ├── directoryService.ts # Business directories, categories, claims
│   ├── eventService.ts     # City events, event categories
│   ├── reviewService.ts    # Ratings & reviews (directory + event)
│   ├── referralService.ts  # Referrals, entitlements, stay-intel
│   ├── bookmarkService.ts  # User bookmarks (private subcollection)
│   ├── noticeService.ts    # City notices / digital notice board
│   ├── entitlementRules.ts # Feature gating / capability matrix
│   ├── shareService.ts     # Deep-link sharing (report, directory, event)
│   ├── notifications.ts    # Push notification registration & handlers
│   ├── remoteConfig.ts     # In-app update version checks
│   ├── auth.ts             # Sign-up, sign-in, Google, account linking
│   ├── storage.ts          # Cloudinary image uploads
│   └── storage-keys.ts     # AsyncStorage key constants
│
├── store/                  # Zustand global stores
│   ├── authStore.ts        # Firebase auth state + Firestore user doc
│   ├── bookmarkStore.ts    # Bookmarked IDs map + optimistic toggle
│   └── locationStore.ts    # GPS coordinates + reverse-geocoded city name
│
├── hooks/                  # React hooks
│   ├── useAuth.tsx         # ⚠️ LEGACY — use store/authStore selectors instead
│   ├── useOnboarding.tsx   # First-launch onboarding state
│   ├── useAppUpdate.tsx    # In-app update prompt provider
│   ├── useKeyboardHeight.ts
│   └── use-color-scheme.*  # System theme detection
│
├── theme/index.ts          # Tokenized theme: Colors, Typography, Spacing, Radii, Shadows
├── types/index.ts          # ALL TypeScript domain types & interfaces
├── constants/              # ⚠️ Legacy Expo starter — do NOT use for app
├── firestore.rules         # Firestore security rules (deploy with Firebase CLI)
├── app.config.js           # Dynamic Expo config (google-services.json resolution)
├── app.json                # Static Expo config
└── functions/              # Firebase Cloud Functions (if any)
```

## State Management Pattern

ReCiti uses **three Zustand stores** for global state, each with selector hooks
to prevent unnecessary re-renders:

### authStore
- `useUser()` — Firebase auth user
- `useUserDoc()` — Firestore user document
- `useAuthLoading()` — initial auth resolution
- `useRefreshUserDoc()` — manual Firestore refresh

### bookmarkStore
- `isBookmarked(targetId)` — O(1) check
- `toggleBookmark(item, userId)` — optimistic UI + haptic + background Firestore write
- `loadSavedItems(userId, filter)` — fetch bookmarks list
- `syncBookmarkedIds(userId)` — bulk load bookmark IDs on login

### locationStore
- `coords` — GPS latitude/longitude
- `cityName` — reverse-geocoded city
- `fetchLocation(force?)` — one-shot location fetch
- `requestPermissionAndFetch()` — request + fetch

**Local component state** is used for UI-only state (form inputs, modal visibility, etc.).

## Feature Map

| Feature | Tab/Route | Service | Firestore Collection |
|---|---|---|---|
| City Pulse Dashboard | `(tabs)/index` | `db.ts` | `reports` |
| Digital Notice Board | `(tabs)/index` | `noticeService.ts` | `city_notices` |
| Civic Report Capture | `(tabs)/capture` | `db.ts`, `storage.ts` | `reports` |
| Report Detail & Comments | `report/[id]` | `db.ts` | `reports`, `reports/*/comments` |
| Story Slides | `report/[id]` | `db.ts` | `reports/*/storySlides` |
| Volunteering | `report/[id]` | `db.ts` | `reports` |
| Business Directories | `(tabs)/directories` | `directoryService.ts` | `directories` |
| Housing (Zero-Broker) | `directories/[id]` | `directoryService.ts`, `entitlementRules.ts` | `directories` |
| Directory Reviews | `directories/[id]` | `reviewService.ts` | `reviews` |
| Listing Claims | `directories/[id]` | `directoryService.ts` | `listing_claims` |
| Stay Intel Contribution | `directories/contribute` | `referralService.ts` | `stay_intel`, `directories` |
| City Events | `(tabs)/events` | `eventService.ts` | `city_events` |
| Event Reviews | `events/[id]` | `reviewService.ts` | `reviews` |
| Explore (Report Feed) | `(tabs)/explore` | `db.ts` | `reports` |
| Daily Trivia | `(tabs)/learn` | `db.ts` | `trivia` |
| User Profile & Tiers | `(tabs)/profile` | `db.ts` | `users` |
| Referral System | `(tabs)/profile` | `referralService.ts` | `referral_events`, `user_entitlements` |
| Bookmarks / Saved | `(tabs)/profile` | `bookmarkService.ts` | `users/*/bookmarks` |
| Notifications | `notifications` | `db.ts`, `notifications.ts` | `users/*/notifications` |

## Cross-Cutting Patterns

1. **Service Layer**: All Firestore access goes through `lib/` service files. Components never import `firebase/firestore` directly.
2. **Optimistic Updates**: Bookmark toggles are optimistic (instant UI, background sync). Report interactions are not optimistic (wait for Firestore).
3. **Real-time Subscriptions**: Reports, notifications, unread counts, entitlements, and categories use `onSnapshot` for live updates.
4. **One-shot Reads**: Directories, events, trivia, bookmarks, and reviews use `getDocs`/`getDoc`.
5. **Client-side Filtering**: Most directory/event queries fetch all docs, then filter in memory (Firestore free-tier constraint).
6. **Lazy Cleanup**: Expired unverified reports are pruned client-side via `pruneExpired()` — no server cron.
7. **Idempotent Doc IDs**: Reviews use `${targetId}_${userId}`, referrals use `${referrerUid}_${referredUid}` to prevent duplicates.
8. **Legacy Category Normalization**: Both directory and event services have legacy category maps for backward compatibility.

## Environment Variables

All `EXPO_PUBLIC_*` vars are inlined at **build time**. After editing `.env`, restart Metro: `npx expo start -c`.

```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET
EXPO_PUBLIC_APP_DOMAIN (default: https://reciti.in)
```
