# ReCiti

A civic-engagement mobile app for urban India. Spot something in your city — a pothole, an overflowing bin, a freshly cleaned park — capture it, and let your neighbours verify and follow it through to resolution. ReCiti turns everyday observations into a shared, community-maintained picture of a city's health.

This is the **V1 MVP**, built with Expo (React Native) and Firebase.

## What it does

ReCiti is organised around five tabs:

- **Pulse** — a city-health dashboard with honest, real-time aggregate stats (open issues, civic wins, pending verifications, week-over-week trend) plus a verification queue, scoped to an optional radius around you.
- **Explore** — a real-time feed of reports, filterable by wins, issues, or items needing verification.
- **Capture** — the center action: take 1–3 photos, tag a vibe (`win` / `fail`) and category (`waste` / `traffic` / `infrastructure`), and submit. Reports are auto-located and reverse-geocoded to a city.
- **Learn** — a daily civic-trivia question (with a browsable archive of past questions) that rewards correct answers.
- **Profile** — your civic points, tier, your reports, and the community leaderboard.

### Report lifecycle

Reports progress through a community-driven, authority-independent lifecycle:

```
pending ──(10 verifications)──▶ verified ──(after-photo)──▶ in_progress ──(6 confirmations)──▶ resolved
   │
   └──(2 flags)──▶ archived
```

- Anyone can **verify** a report; at 10 verifications it becomes `verified`.
- The original reporter can submit an **"after" photo** to mark a fix `in_progress`.
- Neighbours who originally verified it can **confirm** the fix; at 6 confirmations it becomes `resolved`.
- Two **flags** archive a report. Unverified `pending` reports are auto-pruned one hour after creation.

### Engagement & gamification

- **Civic points** — submit a report (+10), verify a report (+5), submit a fix (+10), confirm a fix (+5), correct trivia (+5), a comment marked helpful (+5).
- **Tiers** — `Tourist → Resident → Advocate → Guardian`, earned at 0 / 1,000 / 5,000 / 10,000 points.
- **Comments** — threaded discussion on each report, with community flagging / auto-hide, author soft-delete, and a reporter-awarded "helpful" mark.
- **Notifications** — in-app alerts when your report is verified, commented on, or a fix is submitted/confirmed.

### Accounts

- **Anonymous** — browse-only on first launch; cannot submit reports or comment.
- **Email / password** and **Google Sign-In** — full access. Anonymous accounts are upgraded in place via account linking, so existing context carries over.

## Tech stack

- **Expo SDK 54** / React Native 0.81 / React 19 — new architecture enabled, React Compiler on.
- **Expo Router** — file-based, typed routes.
- **Firebase JS SDK** — Cloud Firestore (data) + Firebase Auth (anonymous / email / Google).
- **Cloudinary** — image hosting via unsigned uploads.
- **Reanimated 4**, **Zustand**, **Plus Jakarta Sans**, and a custom theme system (Emerald brand, light/dark aware).

## Getting started

> ReCiti uses native modules (Google Sign-In, camera, location), so it runs in a **development build**, not Expo Go.

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```bash
# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...

# Google Sign-In — the *Web* OAuth client ID (type 3) from google-services.json
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...

# Cloudinary (unsigned upload preset)
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=...
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=...
```

`EXPO_PUBLIC_*` vars are inlined into the JS bundle at build time — after editing `.env`, restart Metro with `npx expo start -c`.

For Android Google Sign-In you also need a `google-services.json` (package `com.reciti.android`) in the project root. It is git-ignored — provision it locally or via CI secrets.

### 3. Seed trivia (optional)

```bash
npm run seed
```

### 4. Build & run

```bash
npm run android   # prebuild + build + install the Android dev client
npm run ios       # iOS
npm run web       # web (Expo)
```

Once a dev client is installed, start Metro with `npm start`.

## Project structure

```
app/            Expo Router screens (tabs, auth, report detail, onboarding, notifications)
components/     UI primitives (components/ui) and feature components (report, pulse, learn, ...)
lib/            firebase.ts, db.ts (all Firestore access), auth.ts, storage.ts (Cloudinary)
hooks/          useAuth, useOnboarding, theme/keyboard hooks
theme/          custom theme system (useTheme)
types/          shared domain types (User, Report, Comment, TriviaQuestion, Notification)
store/          Zustand stores
scripts/        seed-trivia.js, reset-project.js
firestore.rules Firestore security rules
```

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start the Metro dev server |
| `npm run android` | Prebuild, build, and install the Android dev client |
| `npm run ios` | Build and run on iOS |
| `npm run web` | Run on web |
| `npm run lint` | Lint with `expo lint` |
| `npm run seed` | Seed the Firestore `trivia` collection |

## Architecture notes

- **All Firestore access goes through [`lib/db.ts`](lib/db.ts)** — screens and components never import `firebase/firestore` directly.
- Reports store `latitude`, `longitude`, and a `geohash` (geofire-common) for radius queries.
- Some queries sort client-side instead of using Firestore `orderBy` to avoid composite-index requirements.
- Image uploads are unsigned, so orphaned images can't be deleted from the client; cleanup would need a server using the Cloudinary API secret.
