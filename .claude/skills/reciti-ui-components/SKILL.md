---
name: reciti-ui-components
description: >-
  Use when building or modifying screens and components in the ReCiti app.
  Covers the theme system (useTheme), UI primitives, the full Expo Router
  structure, component organization, and styling/animation conventions.
---

# ReCiti — UI & Components

ReCiti uses **Expo Router** (file-based routing, typed routes) with a custom
tokenized theme system and reusable UI primitives. Styling is
`StyleSheet.create` + inline theme tokens — **no NativeWind/Tailwind** in
component code.

## Theme — always import from `@/theme`

```tsx
import { useTheme } from '@/theme';
const { colors, spacing, radii, shadows, typography, isDark } = useTheme();
```

### Color Tokens (light/dark aware)
- **Core**: `text`, `textMuted`, `background`, `surface`, `border`
- **Brand**: `primary` (#10B981 Emerald), `primaryMuted`
- **Status**: `danger`, `dangerMuted`, `warning`, `warningMuted`
- **Resident Pass VIP**: `subscription` (Gold/Amber), `subscriptionMuted`, `subscriptionText`, `subscriptionBorder`
- **Utility**: `white`, `black`, `transparent`, `glassBackground`

### Design Tokens
- **Spacing**: `xs:4 sm:8 md:16 lg:24 xl:32 xxl:40`
- **Radii**: `sm:8 md:12 lg:16 xl:24 full:9999`
- **Shadows**: `sm | md | lg | none`
- **Typography Family**: Plus Jakarta Sans (`regular`, `medium`, `semiBold`, `bold`)
- **Typography Size**: `xs:12 sm:14 md:16 lg:18 xl:20 xxl:24 xxxl:30`

> ⚠️ There is a leftover `constants/theme.ts` and `hooks/use-theme-color.ts`.
> **Do not use those** — the real theme is `@/theme`.

### Pattern
Keep static layout in `StyleSheet.create`, apply dynamic theme values inline:
```tsx
style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
```

## UI Primitives — [`components/ui/`](../../../components/ui/)

| Component | Purpose | Key Props |
|---|---|---|
| **`Typography`** | All text rendering | `variant`: h1/h2/h3/subtitle/body/caption; `weight`: regular/medium/semiBold/bold; `color`, `align` |
| **`Card`** | Surface container | `padding`: none/sm/md/lg; `variant`: elevated/outlined/flat |
| **`Badge`** | Pill label | `variant`: primary/warning/danger/default; `size`: sm/md |
| **`AnimatedButton`** | Standard touchable (replaces Pressable) | `hapticFeedback`: light/medium/heavy/success/none |
| **`BookmarkButton`** | Save/unsave toggle with haptic + optimistic UI | `targetId`, `item`, `size` |
| **`NotificationBell`** | Header bell with unread count badge | Subscribes to unread count in realtime |
| **`ImageLightboxModal`** | Full-screen pinch-to-zoom gallery | `images`, `visible`, `initialIndex` |
| **`Skeleton`** | Loading placeholder | Animated shimmer effect |
| **`StateView`** | Empty/error/loading states | `variant`: empty/error/loading |

**Never use raw `<Text>` for app content** — always use `Typography`.
**Always use `AnimatedButton`** instead of `Pressable`/`TouchableOpacity`.

## Component Organization

Feature components are organized by domain in `components/`:

| Directory | Domain |
|---|---|
| `components/home/` | Pulse dashboard (stats, verification queue, notice board) |
| `components/pulse/` | City broadcast banners, civic health feed |
| `components/directories/` | Directory cards, category strips, detail views |
| `components/housing/` | Zero-broker cards, stay-intel modals, unlock flows |
| `components/events/` | Event cards, category filters |
| `components/explore/` | Report feed, filter chips |
| `components/profile/` | Resident pass, karma tiers, VIP modals |
| `components/reviews/` | Rating breakdown, review cards, review composer |
| `components/report/` | Report detail sections |
| `components/learn/` | Trivia cards, archive |
| `components/notifications/` | Notification list items |
| `components/onboarding/` | Onboarding slides |
| `components/settings/` | Settings screen sections |
| `components/auth/` | Login/signup forms |
| `components/skeletons/` | Loading skeleton variants |

## Routing — [`app/`](../../../app/)

### Root Layout (`app/_layout.tsx`)
- Loads Plus Jakarta Sans fonts
- Initializes Firebase auth listener (`initAuthListener()`)
- Wraps app in `OnboardingProvider` → `GestureHandlerRootView` → `ThemeProvider` → `AppUpdateProvider`
- Uses `Stack.Protected` guards for onboarding and auth-gated routes

### Tab Navigation (`app/(tabs)/_layout.tsx`)
5 visible tabs + 2 hidden routes:

| Tab | Screen | Icon | Description |
|---|---|---|---|
| Pulse | `index` | earth | City dashboard, stats, notice board, verification queue |
| Directories | `directories` | map | Business/housing directory with search, category & subcategory filters |
| Capture | `capture` | add (floating FAB) | Report submission (1–3 photos, vibe, category, optional description) |
| Events | `events` | sparkles | Community events with category/subcategory filtering |
| Profile | `profile` | person | Civic points, tier, reports, leaderboard, bookmarks, referrals |
| (hidden) | `explore` | — | Full report feed with area filters |
| (hidden) | `learn` | — | Daily trivia + archive |

### Detail / Modal Routes
- `app/report/[id].tsx` — Report detail (comments, story slides, resolution)
- `app/directories/[id].tsx` — Directory item detail (photos, reviews, contact)
- `app/directories/category/[slug].tsx` — Category-filtered directory list
- `app/directories/contribute.tsx` — Stay Intel contribution form (auth-gated)
- `app/events/[id].tsx` — Event detail
- `app/notifications.tsx` — Notification inbox (auth-gated)
- `app/auth/` — Login/signup screens
- `app/onboarding.tsx` — First-launch onboarding flow
- `app/settings.tsx`, `app/tiers.tsx`, `app/about.tsx`, `app/privacy-policy.tsx`, `app/terms.tsx`

## Screen Conventions

1. **Path alias** `@/` maps to project root — always import with `@/...`
2. **Safe areas**: Use `useSafeAreaInsets()` from `react-native-safe-area-context`
3. **Icons**: `Ionicons` from `@expo/vector-icons`
4. **Images**: `Image` from `expo-image` (NOT React Native's `Image`)
5. **Auth state**: Use selector hooks from `@/store/authStore`: `useUser()`, `useUserDoc()`, `useAuthLoading()`
6. **Animations**: React Native Reanimated 4 for micro-interactions; `expo-haptics` for tactile feedback
7. **Lists**: `@legendapp/list` (LegendList) for 60 FPS virtualized lists and carousels
8. **Glassmorphism**: `BlurView` from `expo-blur` for translucent navigation bars
9. **Gate auth actions**: Check `user.isAnonymous` and show Alert routing to `/auth/login`
10. **Typed routes**: `experiments.typedRoutes` is enabled — route strings are type-checked
