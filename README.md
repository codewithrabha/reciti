# 🏙️ ReCiti

<div align="center">

**Your city, in your hands.**

*An all-in-one civic intelligence, zero-broker community housing, and hyperlocal discovery platform.*

[![Expo SDK 55](https://img.shields.io/badge/Expo-SDK_55-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-0.83-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore_%26_Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

</div>

---

## 🌟 Overview

**ReCiti** bridges the gap between active citizens, local neighborhoods, and urban authorities. Whether it’s reporting a persistent pothole, discovering verified neighborhood cafes and essential services, securing zero-broker rental housing directly with owners, or receiving urgent municipal advisories during emergencies — ReCiti brings your entire city into one seamless, fast, and community-driven mobile experience.

---

## ✨ Key Features

### 📡 1. City Pulse & Hyperlocal Notice Board
* **Emergency Broadcasts & Municipal Advisories**: Live, auto-scrolling digital notice board delivering urgent alerts (water supply disruptions, road diversions, civic drives, and health advisories).
* **Civic Health Stream**: Real-time community feed of verified neighborhood issues and wins nearby.
* **Before & After Resolutions**: Citizens post when an issue gets resolved with photographic proof, closing the loop on municipal action.
* **Neighborhood Backing**: Upvote, comment, and share community reports to accelerate civic resolution.

### 📍 2. Verified City Directories & Merchant Hub
* **Multi-Category Directory**: Explore local services across Housing & PGs, Healthcare Clinics, Dining & Cafes, Local Essentials, Open Markets, and Educational Institutions.
* **Multi-Image Gallery & Lightbox**: Interactive thumbnail ribbon with full-screen pinch-to-zoom Lightbox viewer and image counter.
* **One-Tap Actions**: Direct calling, Google Maps / Apple Maps GPS routing, official website links, and Google Business Profile integration.
* **Community Reviews & Ratings**: 5-star rating breakdown, verified resident feedback, and an in-app review composer.
* **Merchant Self-Service**: "List Your Business" and "Claim This Business" verification flow for local shop owners.

### 🏡 3. Zero-Broker Housing & Resident Pass VIP
* **Direct Landlord Contacts**: 100% broker-free housing database with direct phone contacts and exact property coordinates.
* **Rich Rental Profiles**: Filter by BHK type, room sharing, monthly rent, security deposit, curfew rules, furnishing status, and food inclusion.
* **Early Vacancy Radar**: Track upcoming room and flat vacancies before they hit public rental markets.
* **Crowdsourced Stay Intel**: Community members contribute verified rent and owner details (+50 Civic Karma points).
* **3 Fair Unlock Pathways**:
  1. **Referral Mission**: Invite 3 friends to join the civic movement.
  2. **Contribute Stay Intel**: Share details of your current or past rental stay.
  3. **Fast-Track Resident Pass**: Annual digital pass with dedicated VIP gold styling, HRA rent receipts, and priority vacancy alerts.

### 📅 4. Hyperlocal Events & Community Drives
* **Discover What’s Happening**: Local tree plantation drives, neighborhood cleanups, open-air cultural festivals, sports marathons, and civic workshops.
* **Event Schedules & Geolocation**: Event date-time badges, interactive venue directions, and organizer contact details.
* **RSVP & Ticketing**: In-app links to reserve seats or join volunteer drives.

### 🔔 5. Push Notifications & Instant City Dispatch
* **Urgent Alerts**: Native push notifications via Expo Push & Firebase Cloud Messaging (FCM).
* **Topic-Based Delivery**: Target broadcasts based on locality, interest, or civic urgency.
* **Deep-Linked Interactions**: Tap on notifications to jump straight to broadcasts, reports, or directories.

### 🏆 6. Civic Gamification & Community Climb
* **Karmic Progression**: Earn civic karma for every verified report, helpful review, friend invitation, or resolved issue.
* **Citizen Tiers**:
  $$\text{Tourist} \longrightarrow \text{Resident} \longrightarrow \text{Advocate} \longrightarrow \text{Guardian}$$
* **City Leaderboard**: Celebrate top contributors and active neighborhood stewards.

---

## 🛠️ Architecture & Tech Stack

```
ReCiti Workspace
├── reciti/                 # React Native / Expo Mobile Application
│   ├── app/                # Expo Router file-based pages & tab navigation
│   │   ├── (tabs)/         # Bottom tab screens (Pulse, Directories, Capture, Events, Profile)
│   │   ├── directories/    # Directory item details, photo lightbox, review flows
│   │   └── events/         # Event detail pages and RSVPs
│   ├── components/         # Modular, reusable UI component design system
│   │   ├── directories/    # Directory cards, horizontal strips, category templates
│   │   ├── housing/        # Zero-broker cards, Stay Intel & unlock modals
│   │   ├── profile/        # Resident pass cards, VIP modals, karma tiers
│   │   ├── pulse/          # City broadcast banners, notice board, civic health feeds
│   │   └── ui/             # Typography, animated buttons, badges, modals
│   ├── lib/                # Services: Firestore, Auth, Notifications, Cloudinary
│   ├── theme/              # Centralized tokenized Light/Dark theme engine
│   └── types/              # Strict TypeScript data models & schemas
│
└── admin/                  # Web-Based Civic Administration Console (Next.js)
    ├── src/app/            # App Router dashboard (Directories, Events, Reports, Broadcasts)
    └── src/lib/            # Admin Firebase SDK, Cloudinary uploaders & utilities
```

| Layer | Technologies |
|---|---|
| **Mobile Core** | React Native 0.83, Expo SDK 55, Expo Router (Typed routing) |
| **List Virtualization** | `@legendapp/list` (LegendList for 60 FPS carousels and lists) |
| **State & Navigation** | Zustand, React Navigation v7 |
| **Backend & Realtime** | Firebase Firestore, Firebase Authentication, Cloud Storage |
| **Geospatial & GPS** | `expo-location`, `geofire-common` |
| **Push Notifications** | `expo-notifications`, Firebase Cloud Messaging (FCM) |
| **Media & CDN** | Cloudinary CDN, `expo-image`, `expo-camera`, `expo-image-manipulator` |
| **Motion & Micro-interactions** | React Native Reanimated 4, `expo-haptics`, `expo-blur` |
| **Typography & Theme** | Google Fonts Plus Jakarta Sans, Dynamic Light & Dark Mode |
| **Admin Console** | Next.js 15, TailwindCSS, Cloudinary Upload Dropzone |

---

## 🎨 Design System & Theme Engine

ReCiti features a custom tokenized theme system (`theme/index.ts`) supporting automatic system appearance switching:

* **Primary Palette**: Emerald 500 (`#10B981`) representing civic renewal, cleanliness, and growth.
* **Resident Pass VIP Palette**: Warm Gold & Amber (`#D97706` in Light Mode, `#F59E0B` in Dark Mode) with matching muted glows (`#FEF3C7` / `rgba(245, 158, 11, 0.15)`).
* **Typography**: Plus Jakarta Sans (`400 Regular`, `500 Medium`, `600 SemiBold`, `700 Bold`).
* **Glassmorphism**: Translucent backdrop blur navigation bars via `expo-blur`.

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or v20 LTS recommended)
* [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
* [Expo Go](https://expo.dev/go) app on your physical iOS/Android device, or an active iOS Simulator / Android Emulator.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/reciti.git
   cd reciti
   ```

2. **Install mobile dependencies:**
   ```bash
   cd reciti
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in `reciti/` with your Firebase and Cloudinary credentials:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY="your-api-key"
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
   EXPO_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET="your-app.appspot.com"
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
   EXPO_PUBLIC_FIREBASE_APP_ID="your-app-id"
   EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
   EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET="your-upload-preset"
   ```

4. **Start the development server:**
   ```bash
   npx expo start -c
   ```
   * Press `a` for Android Emulator.
   * Press `i` for iOS Simulator.
   * Scan the terminal QR code with **Expo Go** on a physical device.

---

## 🖥️ Running the Admin Portal

The administrative web console allows municipal teams and moderators to review civic issues, manage directories, publish events, and dispatch broadcast notifications.

1. Navigate to the admin folder:
   ```bash
   cd admin
   npm install
   ```
2. Run the Next.js dev server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.

---

## 🤝 Contributing

Contributions are warmly welcome! Whether you are squashing bugs, adding directory categories, or improving municipal workflows:

1. Fork the repo and create your feature branch: `git checkout -b feature/amazing-feature`.
2. Commit your changes: `git commit -m "feat: Add amazing feature"`.
3. Push to your branch: `git push origin feature/amazing-feature`.
4. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">
  <sub>Built with ❤️ for vibrant, transparent, and connected cities.</sub>
</div>
