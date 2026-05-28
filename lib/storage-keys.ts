/** AsyncStorage keys used across the app. */

/** Set to 'true' once the user has completed (or skipped) onboarding. */
export const ONBOARDED_KEY = 'reciti.hasOnboarded';

/**
 * Stores the `latest_version` an optional update prompt was dismissed for, so
 * the user isn't nagged on every launch. A newer version re-prompts; forced
 * updates ignore this entirely.
 */
export const DISMISSED_UPDATE_KEY = 'reciti.dismissedUpdateVersion';
