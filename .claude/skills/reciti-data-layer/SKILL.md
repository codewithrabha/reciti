---
name: reciti-data-layer
description: >-
  Use when adding or modifying Firestore data access in the ReCiti app —
  reports, users, directories, events, notices, reviews, referrals, bookmarks,
  stay-intel, entitlements, story-slides, or the gamification / civic-points
  system. Covers all lib/ service files and the Firestore collections.
---

# ReCiti — Data Layer

ReCiti is a civic-intelligence, zero-broker housing, and hyperlocal discovery platform.
All persistent data lives in **Cloud Firestore** (Firebase JS SDK v12).

## Golden Rule — Service Files

**Screens and components never import `firebase/firestore` directly.** All
Firestore access is routed through dedicated service files in `lib/`:

| Service File | Domain | Key Exports |
|---|---|---|
| [`lib/db.ts`](../../../lib/db.ts) | Reports, users, trivia, comments, notifications, volunteering, story slides, feedback, deletion requests | `createReport`, `verifyReport`, `submitResolution`, `confirmResolution`, `awardPoints`, `subscribeToReports`, `subscribeToComments`, `toggleVolunteer`, `addStorySlide` |
| [`lib/directoryService.ts`](../../../lib/directoryService.ts) | Business directories, categories, subcategories, listing claims | `getDirectoryItems`, `getDirectoryItemById`, `submitListingClaim`, `createDirectoryItem`, `subscribeDynamicCategories` |
| [`lib/eventService.ts`](../../../lib/eventService.ts) | City events, event categories | `getUpcomingEvents`, `getEventById`, `createCityEvent`, `subscribeDynamicEventCategories` |
| [`lib/reviewService.ts`](../../../lib/reviewService.ts) | Ratings & reviews (directory + event) | `submitReview`, `subscribeReviewsForTarget`, `deleteReview`, `toggleHelpfulReview`, `calculateRatingBreakdown` |
| [`lib/referralService.ts`](../../../lib/referralService.ts) | Referrals, entitlements, stay-intel submissions | `claimReferralCode`, `qualifyReferral`, `submitStayIntel`, `subscribeUserEntitlement`, `shareReferral` |
| [`lib/bookmarkService.ts`](../../../lib/bookmarkService.ts) | User bookmarks (private subcollection) | `saveBookmark`, `removeBookmark`, `getUserBookmarks`, `getUserBookmarkedIdMap` |
| [`lib/noticeService.ts`](../../../lib/noticeService.ts) | City notices / digital notice board | `getCityNotices`, `getWelcomeNotices` |
| [`lib/entitlementRules.ts`](../../../lib/entitlementRules.ts) | Capability evaluation (feature gating) | `getEntitlementCapabilities`, `canViewLandlordContact`, `isResidentPassVip` |
| [`lib/shareService.ts`](../../../lib/shareService.ts) | Deep-link sharing | `shareReport`, `shareDirectory`, `shareEvent` |
| [`lib/notifications.ts`](../../../lib/notifications.ts) | Push notification registration | `registerForPushNotificationsAsync`, `setupNotificationListeners` |
| [`lib/remoteConfig.ts`](../../../lib/remoteConfig.ts) | In-app update prompts | `fetchUpdateInfo`, `compareVersions` |

- Firebase singletons (`db`, `auth`) are created once in [`lib/firebase.ts`](../../../lib/firebase.ts).
- Domain types live in [`types/index.ts`](../../../types/index.ts).

## Firestore Collections

| Collection | Doc ID | Type | Notes |
|---|---|---|---|
| `users` | Firebase `uid` | `User` | Created only for non-anonymous users |
| `users/{uid}/notifications` | auto-id | `Notification` | In-app notification inbox |
| `users/{uid}/bookmarks` | `targetId` | `UserBookmark` | Private saved items |
| `reports` | auto-id | `Report` | `reportId` stored inside the doc |
| `reports/{id}/comments` | auto-id | `Comment` | Threaded discussion |
| `reports/{id}/storySlides` | auto-id | `StorySlide` | Reporter-authored update slides (max 10) |
| `directories` | auto-id | `BusinessDirectoryItem` | Includes housing/rental listings |
| `directory_categories` | category key | Dynamic config | Admin-managed, realtime |
| `city_events` | auto-id | `CityEvent` | Community & civic events |
| `event_categories` | category key | Dynamic config | Admin-managed, realtime |
| `city_notices` | auto-id | `CityNotice` | Digital notice board / advisories |
| `reviews` | `${targetId}_${userId}` | `Review` | 1 review per user per target |
| `trivia` | `trivia_XXX` | `TriviaQuestion` | One question active per `activeDate` (YYYY-MM-DD) |
| `user_entitlements` | `uid` | `UserEntitlement` | Housing access / unlock status |
| `referral_events` | `${referrerUid}_${referredUid}` | `ReferralEvent` | Idempotent referral tracking |
| `stay_intel` | auto-id | `StayIntelSubmission` | Community housing contributions |
| `listing_claims` | auto-id | `ListingClaim` | Business ownership verification |
| `feedback` | auto-id | — | User feedback submissions |
| `deletionRequests` | `uid` | — | Account deletion requests |

## Gamification Rules (keep consistent)

Points are awarded via `awardPoints(uid, points)`, which also recalculates `tier`:

| Action | Points | Function |
|---|---|---|
| Submit a report | +10 | `createReport` |
| Verify a report | +5 | `verifyReport` |
| Submit a fix (resolution) | +10 | `submitResolution` |
| Confirm a fix | +5 | `confirmResolution` |
| Correct trivia answer | +5 | `submitTriviaAnswer` |
| Comment marked helpful | +5 | `markCommentHelpful` |
| Upvote a report | +2 | `toggleUpvoteReport` |
| Volunteer for issue | +3 | `toggleVolunteer` |
| Submit a review | +5 | `submitReview` |
| Referral qualified | +25 (both users) | `qualifyReferral` |

### Tier Thresholds (`TIER_THRESHOLDS`)
- **Tourist**: 0 → **Resident**: 1,000 → **Advocate**: 5,000 → **Guardian**: 10,000

### Report Lifecycle Constants
- `VERIFICATION_THRESHOLD = 3` — pending → verified
- `RESOLUTION_CONFIRMATION_THRESHOLD = 6` — in_progress → resolved
- `COMMENT_FLAG_THRESHOLD = 3` — auto-hide comment
- `REPORT_GRACE_PERIOD_MS = 1 hour` — unverified pending reports auto-pruned
- `VOLUNTEER_RESOLVE_BONUS = 100` — bonus to volunteers on resolution

### Report Status Flow
```
pending ──(3 verifications)──▶ verified ──(after-photo)──▶ in_progress ──(6 confirmations)──▶ resolved
   │
   └──(2 flags)──▶ archived
```

## Housing Access / Entitlement System

Users unlock direct landlord contacts via three paths:
1. **Referral Mission**: Invite 3 qualified friends (`unlockedVia: 'referral'`)
2. **Stay Intel**: Contribute your rental details (`unlockedVia: 'stay_intel'`)
3. **Resident Pass**: Annual subscription (`unlockedVia: 'subscription'`)

Capabilities are evaluated in `lib/entitlementRules.ts` → `getEntitlementCapabilities()`.
VIP privileges (early vacancy radar, HRA receipts) are limited to subscription holders.

## Dynamic Categories

Directory and event categories are **admin-managed via Firestore** (`directory_categories` / `event_categories` collections). Services subscribe in realtime and fall back to hardcoded defaults. Use `subscribeDynamicCategories()` / `subscribeDynamicEventCategories()`.

## Conventions When Adding New Data

- Add the type in [`types/index.ts`](../../../types/index.ts).
- Add the service function in the appropriate `lib/*.ts` file.
- Use `Timestamp.now()` for `createdAt` fields; `serverTimestamp()` for server-set times.
- Prevent double-actions by checking array membership before pushing.
- Use idempotent doc IDs where appropriate (e.g., `${targetId}_${userId}` for reviews).
- Guard reads with `snap.exists()`, then `updateDoc`. Use `increment()` for counters.
- Add Firestore security rules in [`firestore.rules`](../../../firestore.rules).
- If your query combines `where` + `orderBy`, expect a composite index requirement — either create it or sort client-side.
