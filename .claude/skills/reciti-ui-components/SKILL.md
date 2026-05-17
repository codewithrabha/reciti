---
name: reciti-ui-components
description: >-
  Use when building or modifying screens and components in the ReCiti app.
  Covers the theme system (useTheme), UI primitives (Typography, Card, Badge,
  AnimatedButton), Expo Router structure, and styling conventions.
---

# ReCiti — UI & Components

ReCiti uses **Expo Router** (file-based routing) with a custom theme system and a
small set of reusable UI primitives. No NativeWind/Tailwind in component code —
styling is `StyleSheet.create` + theme tokens.

## Theme — always use `@/theme`

Import the theme from [`theme/index.ts`](../../../theme/index.ts) via the `useTheme()` hook:

```tsx
import { useTheme } from '@/theme';
const { colors, spacing, radii, shadows, typography, isDark } = useTheme();
```

- `colors` — light/dark aware: `text`, `textMuted`, `background`, `surface`, `border`,
  `primary`, `primaryMuted`, `danger`, `dangerMuted`, `warning`, `warningMuted`,
  `white`, `black`, `glassBackground`. Brand color is Emerald (`primary` `#10B981`).
- `spacing` — `xs:4 sm:8 md:16 lg:24 xl:32 xxl:40`
- `radii` — `sm:8 md:12 lg:16 xl:24 full:9999`
- `shadows` — `sm | md | lg | none`

> ⚠️ There is a leftover Expo-starter `constants/theme.ts` and `hooks/use-theme-color.ts`.
> **Do not use those for app UI** — the real theme is `@/theme`.

Pattern: keep static layout in `StyleSheet.create`, apply dynamic theme values inline:
`style={[styles.card, { backgroundColor: colors.surface }]}`.

## UI primitives — [`components/ui/`](../../../components/ui/)

- **`Typography`** — all text. `variant`: `h1 h2 h3 subtitle body caption`;
  `weight`: `regular medium semiBold bold`; props `color`, `align`. Font is Plus Jakarta Sans.
  Never use raw `<Text>` for app content.
- **`Card`** — surface container. `padding`: `none sm md lg`; `variant`: `elevated outlined flat`.
- **`Badge`** — pill label. `variant`: `primary warning danger default`; `size`: `sm md`.
- **`AnimatedButton`** — the standard touchable. Reanimated press-scale + Expo Haptics.
  `hapticFeedback`: `light medium heavy success none`. Use this instead of `Pressable`/`TouchableOpacity`.

Feature components (e.g. [`ReportCard`](../../../components/ReportCard.tsx)) live in
`components/` and compose the `ui/` primitives.

## Routing — [`app/`](../../../app/)

- `app/_layout.tsx` — root Stack; loads fonts, wraps app in `AuthProvider` + `GestureHandlerRootView`.
- `app/(tabs)/` — main tabs: `index` (Hub), `capture`, `profile`. Tab bar in `(tabs)/_layout.tsx`.
- `app/auth/` — auth screens (`login`).
- `app/modal.tsx` — modal-presented screen.
- `experiments.typedRoutes` is on — route strings are type-checked.

## Screen conventions

- Path alias `@/` maps to the project root — always import with `@/...`.
- Handle safe areas with `useSafeAreaInsets()` from `react-native-safe-area-context`.
- Icons: `Ionicons` from `@expo/vector-icons`. Images: `Image` from `expo-image` (not RN `Image`).
- Read auth state with `useAuth()` from `@/hooks/useAuth` — see the `reciti-auth` skill.
- Gate actions that need a real account on `user.isAnonymous` and show an Alert that
  routes to `/auth/login` (see `capture.tsx` `handleSubmit`).
