# ReCiti — Agent Instructions

## Project Overview
ReCiti is an all-in-one civic intelligence, zero-broker community housing, and hyperlocal discovery React Native app built with Expo SDK 56, React Native 0.85, Firebase, and Zustand.

## Critical Rules

1. **Read the Expo SDK 56 docs** at https://docs.expo.dev/ before writing any code that uses Expo APIs (routing, camera, location, notifications, etc.).
2. **All Firestore access goes through `lib/` service files** — never import `firebase/firestore` directly in screens or components.
3. **Use `@/theme`** for all styling tokens — never use `constants/theme.ts` or `hooks/use-theme-color.ts`.
4. **Use Zustand auth selectors** (`useUser()`, `useUserDoc()` from `@/store/authStore`) — the old `useAuth()` context hook in `hooks/useAuth.tsx` is legacy.
5. **All new types** go in `types/index.ts`.
6. **Always use `expo-image`** (not React Native's `Image`), `AnimatedButton` (not `Pressable`), and `Typography` (not raw `<Text>`).
7. **Path alias `@/`** maps to the project root. Always import with `@/...`.
8. **Typed routes** are enabled — route strings are type-checked via `experiments.typedRoutes`.

## Skills (read before implementing features)

The `.claude/skills/` directory contains detailed architectural guides:

- **`reciti-architecture`** — Full system overview, project structure, tech stack, state management, feature map. **Read this first.**
- **`reciti-data-layer`** — All Firestore collections, service files, gamification rules, tier thresholds, report lifecycle.
- **`reciti-ui-components`** — Theme tokens, UI primitives, component organization, routing structure, screen conventions.
- **`reciti-auth`** — Authentication flow, Zustand auth store, account linking, Google Sign-In config.
- **`reciti-android-build`** — Android build, debug keystore SHA-1, google-services.json, DEVELOPER_ERROR diagnosis.

## Adding a New Feature (checklist)

1. Define types in `types/index.ts`
2. Create/extend service functions in the appropriate `lib/*.ts` file
3. Add Firestore security rules in `firestore.rules`
4. Create components in `components/<feature>/`
5. Add routes in `app/` (register in `app/_layout.tsx` if needed)
6. If the feature needs global state, add a Zustand store in `store/`
7. Test on both light and dark themes
