import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { Linking, Platform, Share } from 'react-native';
import { db } from './firebase';
import { APP_DOMAIN } from './shareService';
import { getSubcategoryLabel } from './directoryService';
import {
  ReferralContext,
  ReferralEvent,
  StayIntelSubmission,
  User,
  UserEntitlement,
} from '@/types';

const ENTITLEMENTS_COL = 'user_entitlements';
const REFERRAL_EVENTS_COL = 'referral_events';
const STAY_INTEL_COL = 'stay_intel';
const DIRECTORIES_COL = 'directories';
const USERS_COL = 'users';

/**
 * Returns a standardized referral code for a citizen (e.g. RECITI-AB12CD).
 */
export function getReferralCodeForUser(uid: string, displayName?: string | null): string {
  if (!uid) return 'RECITI-CITIZEN';
  const prefix = displayName
    ? displayName.trim().split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
    : 'REC';
  const suffix = uid.slice(0, 4).toUpperCase();
  return `RECITI-${prefix}${suffix}`;
}

/**
 * Default empty entitlement object.
 */
export function createDefaultEntitlement(uid: string): UserEntitlement {
  return {
    uid,
    isUnlocked: false,
    referralCount: 0,
    referralsQualifiedCount: 0,
    unlockedVia: undefined,
    validUntil: null,
    stayIntelSubmittedId: null,
  };
}

/**
 * Real-time subscription to a user's entitlement / rental unlock status.
 */
export function subscribeUserEntitlement(
  uid: string,
  onUpdate: (entitlement: UserEntitlement) => void,
  onError?: (err: any) => void
): () => void {
  if (!uid) {
    onUpdate(createDefaultEntitlement(''));
    return () => {};
  }

  const docRef = doc(db, ENTITLEMENTS_COL, uid);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserEntitlement;
        onUpdate({
          ...createDefaultEntitlement(uid),
          ...data,
          uid,
        });
      } else {
        onUpdate(createDefaultEntitlement(uid));
      }
    },
    (err) => {
      console.warn('[referralService] subscribeUserEntitlement warning:', err?.message || err);
      if (onError) onError(err);
      onUpdate(createDefaultEntitlement(uid));
    }
  );
}

/**
 * Fetches user entitlement snapshot once.
 */
export async function getUserEntitlement(uid: string): Promise<UserEntitlement> {
  if (!uid) return createDefaultEntitlement('');
  try {
    const docRef = doc(db, ENTITLEMENTS_COL, uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return {
        ...createDefaultEntitlement(uid),
        ...(snap.data() as UserEntitlement),
        uid,
      };
    }
  } catch (err) {
    console.warn('[referralService] getUserEntitlement error:', err);
  }
  return createDefaultEntitlement(uid);
}

/**
 * Finds a user UID given a referral code.
 */
export async function findUserByReferralCode(code: string): Promise<{ uid: string; displayName?: string } | null> {
  const clean = code.trim().toUpperCase();
  if (!clean.startsWith('RECITI-')) return null;

  try {
    const q = query(collection(db, USERS_COL), limit(200));
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const userCode = getReferralCodeForUser(docSnap.id, data.displayName);
      if (userCode === clean) {
        return { uid: docSnap.id, displayName: data.displayName };
      }
    }
  } catch (err) {
    console.warn('[referralService] findUserByReferralCode error:', err);
  }
  return null;
}

/**
 * Step 1 of Secure Referral:
 * Claims a referral code during app entry or onboarding.
 * Implements ReelBlink anti-abuse rules:
 * - Prevents self-referral
 * - Enforces single attribution per referred user
 * - Uses idempotent compound document ID `${referrerUid}_${referredUid}`
 */
export async function claimReferralCode(
  referredUid: string,
  referralCode: string,
  context: ReferralContext = 'rental_mission'
): Promise<{ success: boolean; message: string }> {
  if (!referredUid || !referralCode.trim()) {
    return { success: false, message: 'Invalid referral code or user session.' };
  }

  const referrer = await findUserByReferralCode(referralCode);
  if (!referrer) {
    return { success: false, message: 'Referral code not found. Please check and try again.' };
  }

  // Anti-abuse: Self-referral
  if (referrer.uid === referredUid) {
    return { success: false, message: 'You cannot use your own referral code.' };
  }

  // Anti-abuse: One-time qualification check
  const existingClaimQuery = query(
    collection(db, REFERRAL_EVENTS_COL),
    where('referredUid', '==', referredUid),
    limit(1)
  );
  const existingSnap = await getDocs(existingClaimQuery);
  if (!existingSnap.empty) {
    return { success: false, message: 'You have already applied a referral code.' };
  }

  // Idempotent doc ID
  const eventId = `${referrer.uid}_${referredUid}`;
  const eventDocRef = doc(db, REFERRAL_EVENTS_COL, eventId);

  try {
    await setDoc(eventDocRef, {
      id: eventId,
      referrerUid: referrer.uid,
      referredUid,
      referralCode: referralCode.trim().toUpperCase(),
      context,
      status: 'pending',
      rewardGranted: false,
      createdAt: serverTimestamp(),
    });

    return {
      success: true,
      message: `Referral code applied! Welcome from ${referrer.displayName || 'a fellow citizen'}.`,
    };
  } catch (err: any) {
    console.error('[referralService] claimReferralCode error:', err);
    return { success: false, message: err?.message || 'Failed to claim referral code.' };
  }
}

/**
 * Step 2 of Secure Referral (ReelBlink "Do Not Reward Immediately"):
 * Triggered after user authentication & basic city onboarding completes.
 * Uses atomic Firestore transactions to avoid race conditions or replay attacks.
 */
export async function qualifyReferral(
  referredUid: string
): Promise<{ success: boolean; rewarded: boolean }> {
  if (!referredUid) return { success: false, rewarded: false };

  try {
    // Find pending referral for this user
    const q = query(
      collection(db, REFERRAL_EVENTS_COL),
      where('referredUid', '==', referredUid),
      where('status', '==', 'pending'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      return { success: false, rewarded: false };
    }

    const eventDoc = snap.docs[0];
    const eventData = eventDoc.data() as ReferralEvent;
    const { referrerUid } = eventData;

    // Execute atomic transaction
    await runTransaction(db, async (txn) => {
      const eventRef = doc(db, REFERRAL_EVENTS_COL, eventDoc.id);
      const referrerEntRef = doc(db, ENTITLEMENTS_COL, referrerUid);
      const referrerUserRef = doc(db, USERS_COL, referrerUid);
      const referredUserRef = doc(db, USERS_COL, referredUid);

      const eventSnap = await txn.get(eventRef);
      if (!eventSnap.exists() || eventSnap.data()?.status !== 'pending') {
        return;
      }

      const referrerEntSnap = await txn.get(referrerEntRef);
      const currentCount = referrerEntSnap.exists()
        ? (referrerEntSnap.data()?.referralCount || 0)
        : 0;
      const newCount = currentCount + 1;
      const willUnlock = newCount >= 3;

      // 1. Mark referral event as qualified
      txn.update(eventRef, {
        status: 'qualified',
        qualifiedAt: serverTimestamp(),
        rewardGranted: true,
      });

      // 2. Update referrer entitlement atomically
      txn.set(
        referrerEntRef,
        {
          uid: referrerUid,
          referralCount: newCount,
          referralsQualifiedCount: newCount,
          isUnlocked: willUnlock || (referrerEntSnap.data()?.isUnlocked ?? false),
          unlockedVia: willUnlock ? 'referral' : (referrerEntSnap.data()?.unlockedVia ?? null),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 3. Award Civic Points (+25 pts) to both users
      const refUserSnap = await txn.get(referrerUserRef);
      if (refUserSnap.exists()) {
        const prevPts = refUserSnap.data()?.civicPoints || 0;
        txn.update(referrerUserRef, { civicPoints: prevPts + 25 });
      }

      const referredUserSnap = await txn.get(referredUserRef);
      if (referredUserSnap.exists()) {
        const prevPts = referredUserSnap.data()?.civicPoints || 0;
        txn.update(referredUserRef, { civicPoints: prevPts + 25 });
      }
    });

    return { success: true, rewarded: true };
  } catch (err) {
    console.error('[referralService] qualifyReferral error:', err);
    return { success: false, rewarded: false };
  }
}

/**
 * Path B: "Stay Intel" Submission
 * Existing tenants contribute their current PG/rental details or upcoming vacancy.
 * Grants instant lifetime unlock to the submitter + awards +50 Civic Points!
 */
export async function submitStayIntel(
  user: { uid: string; displayName?: string | null; [key: string]: any },
  intel: Omit<StayIntelSubmission, 'id' | 'submitterUid' | 'createdAt' | 'status'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!user || !user.uid) {
    return { success: false, error: 'User must be authenticated.' };
  }

  try {
    const intelDocRef = doc(collection(db, STAY_INTEL_COL));
    const intelId = intelDocRef.id;

    const intelPayload: StayIntelSubmission = {
      ...intel,
      id: intelId,
      submitterUid: user.uid,
      submitterName: user.displayName || 'Anonymous Tenant',
      status: 'active',
      createdAt: serverTimestamp(),
    };

    // Save stay intel
    await setDoc(intelDocRef, intelPayload);

    // Create crowdsourced listing draft in directories collection
    const listingDocRef = doc(collection(db, DIRECTORIES_COL));
    await setDoc(listingDocRef, {
      id: listingDocRef.id,
      name: intel.propertyName || `${intel.locality} ${formatPropertyType(intel.propertyType)}`,
      category: 'housing_rentals',
      subcategory: intel.propertyType,
      description: intel.vacatingNote
        ? `Tenant Note: ${intel.vacatingNote}`
        : `Verified zero-broker ${formatPropertyType(intel.propertyType)} in ${intel.locality}.`,
      address: `${intel.locality}, ${intel.city || 'Local Area'}`,
      city: intel.city || 'Bongaigaon',
      latitude: 26.505,
      longitude: 90.54,
      phone: intel.landlordPhone,
      landlordName: intel.landlordName,
      monthlyRent: intel.monthlyRent,
      securityDeposit: intel.securityDeposit || 0,
      foodIncluded: intel.foodIncluded,
      curfewTime: intel.curfewTime || 'None',
      vacancyStatus: intel.vacatingSoon ? 'vacating_soon' : 'available_now',
      availableFromDate: intel.moveOutDate || 'Available Now',
      vacatingTenantNote: intel.vacatingNote || null,
      isZeroBrokerVerified: true,
      imageUrl: getDefaultHousingImage(intel.propertyType),
      rating: 5.0,
      reviewCount: 1,
      isVerified: true,
      createdAt: serverTimestamp(),
    });

    // Grant instant unlock entitlement to user
    const entRef = doc(db, ENTITLEMENTS_COL, user.uid);
    await setDoc(
      entRef,
      {
        uid: user.uid,
        isUnlocked: true,
        unlockedVia: 'stay_intel',
        stayIntelSubmittedId: intelId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Award +50 Civic Points
    const userRef = doc(db, USERS_COL, user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const currentPts = userSnap.data()?.civicPoints || 0;
      await setDoc(userRef, { civicPoints: currentPts + 50 }, { merge: true });
    }

    return { success: true, id: intelId };
  } catch (err: any) {
    console.error('[referralService] submitStayIntel error:', err);
    return { success: false, error: err?.message || 'Failed to submit stay intel.' };
  }
}

function formatPropertyType(type: string): string {
  switch (type) {
    case 'bhk':
      return 'BHK Flat / Apartment';
    case 'pg':
      return 'Paying Guest (PG)';
    case 'hostel':
      return 'Student / Working Hostel';
    case 'rk':
      return '1 RK (Room Kitchen)';
    case 'room':
      return 'Single Room Rental';
    case 'pg_boys':
      return 'Boys PG / Hostel';
    case 'pg_girls':
      return 'Girls PG / Hostel';
    case 'pg_coed':
      return 'Co-ed PG';
    case 'flat':
      return 'Rental Flat';
    case 'room_rental':
      return 'Room Rental';
    default:
      return getSubcategoryLabel(type) || type.replace(/_/g, ' ');
  }
}

function getDefaultHousingImage(type: string): string {
  switch (type) {
    case 'bhk':
    case 'flat':
      return 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80';
    case 'pg':
    case 'hostel':
    case 'pg_girls':
    case 'pg_boys':
    case 'pg_coed':
      return 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80';
    case 'rk':
    case 'room':
    case 'room_rental':
      return 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80';
    default:
      return 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80';
  }
}

/**
 * Shares referral link via WhatsApp or native OS share sheet with dynamic context messaging.
 */
export async function shareReferral(
  referralCode: string,
  context: ReferralContext = 'rental_mission'
): Promise<void> {
  const deepLink = `${APP_DOMAIN}/r/${referralCode}?src=${context}`;

  let message = '';
  if (context === 'rental_mission') {
    message =
      `🏠 Hey! I'm searching for verified, zero-broker PGs & rental houses in our city on ReCiti.\n\n` +
      `Open my link so we can both unlock direct landlord contact numbers and upcoming vacancies for free:\n` +
      `${deepLink}\n\n` +
      `Or enter code "${referralCode}" when signing up!`;
  } else {
    message =
      `🌟 Join me on ReCiti — our official city community app!\n\n` +
      `Track municipal updates, report street & waste issues, solve daily trivia, and discover local spots:\n` +
      `${deepLink}\n\n` +
      `Use my referral code: ${referralCode}`;
  }

  // Attempt WhatsApp direct share first on mobile
  const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
  const canOpenWhatsapp = await Linking.canOpenURL(whatsappUrl).catch(() => false);

  if (canOpenWhatsapp) {
    await Linking.openURL(whatsappUrl);
  } else {
    await Share.share(
      Platform.select({
        ios: { message, url: deepLink },
        default: { message, title: 'Join ReCiti Community' },
      })
    );
  }
}
