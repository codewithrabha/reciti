import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getApp } from '@react-native-firebase/app';
import {
  getRemoteConfig,
  setConfigSettings,
  setDefaults,
  fetchAndActivate,
  getValue,
} from '@react-native-firebase/remote-config';

export type UpdateStatus = 'none' | 'optional' | 'forced';

export interface UpdateInfo {
  status: UpdateStatus;
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  storeUrl: string;
}

/** The version baked into this build (app.json `version`). */
const CURRENT_VERSION = Constants.expoConfig?.version ?? '0.0.0';

const ANDROID_STORE = 'https://play.google.com/store/apps/details?id=com.reciti.android';

/**
 * In-app defaults for every Remote Config key. They are returned until the
 * first successful fetch, and act as a safety net if a key is missing in the
 * console — `0.0.0` means "no update available", so nothing is prompted.
 */
const DEFAULTS: Record<string, string> = {
  latest_version_android: '0.0.0',
  minimum_version_android: '0.0.0',
  release_notes_android: '',
  latest_version_ios: '0.0.0',
  minimum_version_ios: '0.0.0',
  release_notes_ios: '',
  store_url_android: ANDROID_STORE,
  store_url_ios: '',
};

/**
 * Compares two dotted version strings (e.g. "1.2.0").
 * Returns 1 if a > b, -1 if a < b, 0 if equal. Non-numeric parts count as 0.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.');
  const pb = b.split('.');
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = parseInt(pa[i], 10) || 0;
    const y = parseInt(pb[i], 10) || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

let configured = false;

async function ensureConfigured() {
  const instance = getRemoteConfig(getApp());
  if (!configured) {
    await setConfigSettings(instance, {
      // Dev: always hit the network so changes show immediately.
      // Prod: throttle to once an hour to respect Remote Config quotas.
      minimumFetchIntervalMillis: __DEV__ ? 0 : 60 * 60 * 1000,
      fetchTimeMillis: 10_000,
    });
    await setDefaults(instance, DEFAULTS);
    configured = true;
  }
  return instance;
}

/**
 * Fetches Remote Config, picks the keys for the current platform, and decides
 * whether an update is needed by comparing the installed version against
 * `minimum_version_*` (forced) and `latest_version_*` (optional).
 *
 * Throws on the web (RN Firebase is native-only) or if the native module is
 * missing (e.g. before the dev client is rebuilt) — callers should treat a
 * throw as "no update" so the app keeps working.
 */
export async function fetchUpdateInfo(): Promise<UpdateInfo> {
  if (Platform.OS === 'web') {
    return {
      status: 'none',
      currentVersion: CURRENT_VERSION,
      latestVersion: CURRENT_VERSION,
      releaseNotes: '',
      storeUrl: '',
    };
  }

  const instance = await ensureConfigured();
  await fetchAndActivate(instance);

  const isIOS = Platform.OS === 'ios';
  const latest = getValue(instance, isIOS ? 'latest_version_ios' : 'latest_version_android').asString();
  const minimum = getValue(instance, isIOS ? 'minimum_version_ios' : 'minimum_version_android').asString();
  const releaseNotes = getValue(instance, isIOS ? 'release_notes_ios' : 'release_notes_android').asString();
  const storeUrl = getValue(instance, isIOS ? 'store_url_ios' : 'store_url_android').asString();

  let status: UpdateStatus = 'none';
  if (compareVersions(CURRENT_VERSION, minimum) < 0) status = 'forced';
  else if (compareVersions(CURRENT_VERSION, latest) < 0) status = 'optional';

  return {
    status,
    currentVersion: CURRENT_VERSION,
    latestVersion: latest,
    releaseNotes,
    storeUrl,
  };
}
