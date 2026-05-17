---
name: reciti-android-build
description: >-
  Use when building, running, or debugging the ReCiti Android app — dev-client
  builds, the debug keystore SHA-1 / google-services.json setup, Firebase native
  config, or a Google Sign-In DEVELOPER_ERROR.
---

# ReCiti — Android Build & Firebase Native Config

ReCiti is an **Expo SDK 54** app using **CNG (prebuild)** with a committed
`android/` folder, `expo-dev-client`, and `newArchEnabled: true`.

## Building / running

- `npx expo run:android` — prebuild + build + install the debug dev client.
- `./gradlew.bat assembleDebug` (inside `android/`) — build the debug APK directly.
- `npx expo start -c` — start Metro with a cleared cache (needed after `.env` changes,
  since `EXPO_PUBLIC_*` vars are inlined at bundle time).

The `android/` folder is generated. Avoid hand-editing it — `expo prebuild --clean`
regenerates it. Prefer changing `app.json` / config plugins.

## Debug keystore — the SHA-1 gotcha ⚠️

An Expo-prebuilt project signs debug builds with **`android/app/debug.keystore`**
(Expo's bundled default keystore) — **NOT** the global `~/.android/debug.keystore`.
They have different SHA-1 fingerprints. Get the one that actually signs the build:

```bash
keytool -list -v -keystore android/app/debug.keystore \
  -alias androiddebugkey -storepass android -keypass android
```

Known fingerprints for this project (both registered in Firebase):

| Keystore | SHA-1 |
|---|---|
| `android/app/debug.keystore` (signs the build) | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` |
| `~/.android/debug.keystore` | `F1:19:93:05:FF:71:D5:87:FA:D0:E2:A9:4D:B2:8A:25:35:67:F8:BA` |

## `google-services.json`

- App package / `applicationId`: **`com.reciti.android`**. Firebase project: **`reciti-dev`**.
- Configured via `app.json` → `android.googleServicesFile: "./google-services.json"`.
- **Two copies must stay identical:** the root `./google-services.json` (source) and
  `android/app/google-services.json` (copied during prebuild). After downloading a new
  one from Firebase, replace **both** and rebuild.
- It is git-ignored / untracked — don't expect it in version control.

## Diagnosing `DEVELOPER_ERROR` on Google Sign-In

It is always a native config mismatch. Check, in order:

1. **SHA-1** — the fingerprint of the keystore signing the build (see above) must be
   registered on the Firebase Android app, and present in `google-services.json` as a
   `certificate_hash` (lowercase, no colons).
2. **Package name** — `com.reciti.android` everywhere (`app.json`, `build.gradle`
   `applicationId`, `google-services.json`).
3. **`webClientId`** — must be the Web OAuth client (`client_type: 3`); see `reciti-auth`.
4. After fixing config: **uninstall the old APK** (Play Services caches sign-in state
   per package), then rebuild.

For Play Store / internal-testing installs, Google re-signs with its own key — add
that App Signing SHA-1 from the Play Console too.

## Plugins

`app.json` `plugins` includes `@react-native-google-signin/google-signin`,
`expo-router`, `expo-camera`, `expo-image-picker`, `expo-location`, `expo-splash-screen`.
Keep each plugin listed **once** — duplicates cause the config plugin to run twice.
