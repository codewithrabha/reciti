---
name: reciti-data-layer
description: >-
  Use when adding or modifying Firestore data access in the ReCiti app — the
  report/user/trivia schema, civic points, tiers, verification/flagging, or
  trivia. Covers lib/db.ts conventions and the Firestore collections.
---

# ReCiti — Data Layer

ReCiti is a civic-reporting app. All persistent data lives in **Cloud Firestore**.

## Golden rule

**All Firestore access goes through [`lib/db.ts`](../../../lib/db.ts).** Screens and
components never import `firebase/firestore` directly — they call functions from
`@/lib/db`. When you need new data behaviour, add/extend a function in `lib/db.ts`.

- Firebase singletons (`db`, `auth`, `storage`) are created once in [`lib/firebase.ts`](../../../lib/firebase.ts).
- Domain types live in [`types/index.ts`](../../../types/index.ts): `User`, `Report`, `TriviaQuestion`, `Tier`.
- Image uploads go through [`lib/storage.ts`](../../../lib/storage.ts) → `uploadImage(localUri, reportId)`.

## Collections

| Collection | Doc ID | Type | Notes |
|---|---|---|---|
| `users`   | Firebase `uid` | `User`          | Created only for **non-anonymous** users |
| `reports` | auto-id        | `Report`        | `reportId` stored inside the doc too |
| `trivia`  | `trivia_XXX`   | `TriviaQuestion`| One question active per `activeDate` (`YYYY-MM-DD`) |

## Gamification rules (keep these consistent)

Civic points are awarded via `awardPoints(uid, points)`, which also recalculates `tier`:

- **Submit a report** → reporter gets **+10** (`createReport`)
- **Verify a report** → verifier gets **+5** (`verifyReport`)
- **Correct trivia answer** → user gets **+5** (`submitTriviaAnswer`)

Thresholds:
- A report becomes `verified` at **3** entries in `verifiedBy`.
- A report becomes `archived` at **2** entries in `flaggedBy`.
- Tiers (`getTierForPoints` / `TIER_THRESHOLDS`): `Tourist` 0 → `Resident` 50 → `Advocate` 150 → `Guardian` 300.

`Report.status` is `'pending' | 'verified' | 'archived'`. `Report.vibe` is `'win' | 'fail'`.
`Report.category` is `'waste' | 'traffic' | 'infrastructure'`.

## Conventions when editing `lib/db.ts`

- Read a doc, guard with `snap.exists()`, then `updateDoc`. Use `increment()` for counters.
- Prevent double-actions by checking membership before pushing to `verifiedBy` / `flaggedBy`.
- Geo: reports store `latitude`, `longitude`, and a `geohash` from `geohashForLocation` (`geofire-common`).
- New reports use `Timestamp.now()` for `createdAt`.

## Known gotcha — Firestore composite index

`subscribeToReports` currently has **no `orderBy('createdAt','desc')`** — see the
`TODO` in `lib/db.ts`. Results are sorted **client-side** instead, because the
composite index (`status` + `vibe` + `createdAt`) was not yet built. If you add a
query that combines `where` filters with `orderBy`, expect a Firestore error with
a console link to create the index — either create it or sort client-side.

## Seeding

[`scripts/seed-trivia.js`](../../../scripts/seed-trivia.js) seeds the `trivia`
collection: `node ./scripts/seed-trivia.js`. Note it hard-codes the Firebase
config (duplicated from `.env`) — keep both in sync if the project changes.
