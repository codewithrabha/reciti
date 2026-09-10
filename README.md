# ReCiti

**Your city, in your hands.**

ReCiti is an all-in-one community app that turns everyday observations into real change while keeping you connected to your city. See a pothole, an overflowing bin, a broken streetlight — or a freshly cleaned park? Snap a photo, share it, and let your neighbours back you up and follow it through to a fix. Looking for local community cleanups, verified neighborhood stores, or urgent municipal advisories? ReCiti brings it all together in one place.

Together, we build an honest, living picture of how our city is really doing.

---

## How it works

**1. Spot it**  
Notice something in your neighbourhood — good or bad. A problem that needs fixing, or a community win worth celebrating.

**2. Capture it**  
Take a quick photo, add a tag, and post it. Your report is automatically reverse-geocoded and placed on the city map, so neighbours and authorities know exactly where it is.

**3. Back it up**  
Neighbours can verify your report, upvote it, comment on it, and share it. The more citizens who stand behind an issue, the faster it gets addressed.

**4. Follow it to the finish**  
When something gets fixed, the community shares an "after" photo confirming the resolution — and everyone celebrates the win together.

---

## What you'll find inside

* **Pulse (Home)** — Your dynamic daily city command center:
  * **City Broadcasts & Notice Board** — An auto-sliding, swipeable digital notice board delivering urgent municipal alerts (water maintenance, road diversions), community drives, citizen spotlights, and app feature updates.
  * **Civic Health** — Live carousel of verified issues and wins nearby with real-time upvotes, comments, and sharing.
  * **Happening Around You** — Quick highlights of upcoming civic and cultural events in your town.
  * **Local Spots & Findings** — Verified neighborhood stores, healthcare clinics, and essential services.

* **Directories** — A rich, informational city directory:
  * Browse verified local shops, grocery stores, healthcare centers, institutions, open markets, and essential repair services.
  * Quick access to business hours, phone contacts, one-tap directions (Google Maps / Apple Maps), and official websites.
  * Filter easily by category with high-performance virtualization.

* **Capture** — The heart of civic participation:
  * Report an issue or celebrate a community win in seconds with camera capture or gallery selection.
  * Categorize across waste, traffic, infrastructure, and more.

* **Events** — Discover civic and cultural happenings:
  * Explore local community cleanups, tree-planting drives, music sundowners, art walks, sports marathons, and sustainability workshops.
  * View complete event details, dates, venue locations, and organizer contacts.

* **Profile & Impact** — Track your civic journey:
  * See your contribution stats, review your submitted reports, track civic karma points, and climb the ranks on the city leaderboard.

---

## Earn your stripes

Every action you take helps your community — and earns you points along the way. Report an issue, verify a neighbour's post, share a fix, or participate in local civic challenges. As your points grow, you rise through the ranks:

$$\text{Tourist} \longrightarrow \text{Resident} \longrightarrow \text{Advocate} \longrightarrow \text{Guardian}$$

The more you contribute, the more your city becomes truly *yours*.

---

## Tech Stack & Architecture

* **Framework**: React Native with [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/) & Expo Router (typed file-based routing)
* **Performance**: `@legendapp/list` (LegendList) for high-performance virtualized carousels and lists
* **Backend & Realtime**: Firebase Firestore, Auth, and Storage
* **Location**: `expo-location` for GPS coordinates and automatic reverse-geocoding
* **UI & Animation**: React Native Reanimated, Expo Image, and a tokenized design system supporting clean dark and light themes

---

## Why ReCiti?

Cities work best when the people who live in them are informed and heard. ReCiti gives everyone a simple, powerful way to stay updated with city broadcasts, discover local gems and events, rally their neighbours, and watch real problems get solved — together.

**Spot it. Share it. Fix it.**

---

*Want to help build ReCiti? See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and developer docs.*
