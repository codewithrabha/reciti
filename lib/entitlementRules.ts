import { UserEntitlement } from '@/types';

export interface EntitlementBadgeTheme {
  title: string;
  subtitle: string;
  badgeLabel: string;
  iconName: 'ribbon' | 'home' | 'people' | 'shield-checkmark' | 'lock-closed';
  accentColor: string;
  bgColor: string;
  borderColor: string;
}

export interface EntitlementCapabilities {
  // ── Core Access Gates ────────────────────────────────────────────────
  canViewLandlordPhone: boolean;
  canViewExactLocation: boolean;

  // ── VIP Privileges (Resident Pass) ──────────────────────────────────
  isResidentPassVip: boolean;
  canAccessEarlyRadar: boolean;
  canGenerateHraReceipts: boolean;
  canUseExpenseSplitter: boolean;

  // ── Provenance & Identity ───────────────────────────────────────────
  provenance: 'subscription' | 'referral' | 'stay_intel' | 'civic_points' | 'locked';

  // ── Visual Theme for Cards & Badges ─────────────────────────────────
  theme: EntitlementBadgeTheme;
}

/**
 * Centralized Capabilities & Feature Matrix evaluator.
 * Decouples access flags from hardcoded checks in the UI.
 */
export function getEntitlementCapabilities(
  entitlement: UserEntitlement | null | undefined
): EntitlementCapabilities {
  const hasValidTemporaryAccess = Boolean(
    entitlement?.housingAccessExpiresAt &&
      (typeof entitlement.housingAccessExpiresAt === 'number'
        ? entitlement.housingAccessExpiresAt > Date.now()
        : (entitlement.housingAccessExpiresAt as any).toMillis
        ? (entitlement.housingAccessExpiresAt as any).toMillis() > Date.now()
        : false)
  );

  const isUnlocked = Boolean(entitlement?.isUnlocked || hasValidTemporaryAccess);
  const method = entitlement?.unlockedVia;

  // Currently, VIP privileges are tied to 'subscription' (or future tier flag)
  const isVip = isUnlocked && method === 'subscription';

  const provenance = !isUnlocked
    ? 'locked'
    : method === 'subscription'
    ? 'subscription'
    : method === 'stay_intel'
    ? 'stay_intel'
    : method === 'referral'
    ? 'referral'
    : 'civic_points';

  const theme: EntitlementBadgeTheme = (() => {
    if (!isUnlocked) {
      return {
        title: 'Resident Pass: Inactive',
        subtitle: 'Unlock direct owner contacts & coordinates via referrals or Resident Pass.',
        badgeLabel: 'LOCKED',
        iconName: 'lock-closed',
        accentColor: '#9CA3AF',
        bgColor: '#9CA3AF10',
        borderColor: '#9CA3AF30',
      };
    }

    if (method === 'subscription') {
      return {
        title: 'Resident Pass Active',
        subtitle: 'Unlimited Zero-Broker Direct Access to all rental properties & owner contacts.',
        badgeLabel: 'RESIDENT PASS',
        iconName: 'ribbon',
        accentColor: '#D97706', // Gold / Amber
        bgColor: '#FEF3C718',
        borderColor: '#F59E0B60',
      };
    }

    if (method === 'stay_intel') {
      return {
        title: 'Community Contributor Access',
        subtitle: 'Unlocked via your verified Stay Intel contribution. Thank you for civic transparency!',
        badgeLabel: 'STAY INTEL',
        iconName: 'home',
        accentColor: '#2563EB', // Blue
        bgColor: '#3B82F614',
        borderColor: '#3B82F650',
      };
    }

    if (method === 'referral') {
      return {
        title: 'Civic Ambassador Access',
        subtitle: 'Unlocked by inviting 3 verified friends. Zero brokerage, 100% direct landlord access.',
        badgeLabel: '3 REFERRALS',
        iconName: 'people',
        accentColor: '#059669', // Emerald
        bgColor: '#10B98114',
        borderColor: '#10B98150',
      };
    }

    return {
      title: 'Direct Contact Unlocked',
      subtitle: 'Zero-Broker Civic Access active. You can call the landlord and view the exact building.',
      badgeLabel: 'VERIFIED',
      iconName: 'shield-checkmark',
      accentColor: '#059669',
      bgColor: '#10B98114',
      borderColor: '#10B98150',
    };
  })();

  return {
    canViewLandlordPhone: isUnlocked,
    canViewExactLocation: isUnlocked,
    isResidentPassVip: isVip,
    canAccessEarlyRadar: isVip,
    canGenerateHraReceipts: isVip,
    canUseExpenseSplitter: isVip,
    provenance,
    theme,
  };
}

// ── Lightweight Boolean Selectors ──────────────────────────────────────────

export const canViewLandlordContact = (
  ent: UserEntitlement | null | undefined
): boolean => getEntitlementCapabilities(ent).canViewLandlordPhone;

export const canViewExactLocation = (
  ent: UserEntitlement | null | undefined
): boolean => getEntitlementCapabilities(ent).canViewExactLocation;

export const isResidentPassVip = (
  ent: UserEntitlement | null | undefined
): boolean => getEntitlementCapabilities(ent).isResidentPassVip;

export const canAccessEarlyRadar = (
  ent: UserEntitlement | null | undefined
): boolean => isResidentPassVip(ent);

export const canGenerateHraReceipts = (
  ent: UserEntitlement | null | undefined
): boolean => isResidentPassVip(ent);
