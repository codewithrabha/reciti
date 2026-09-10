import * as admin from 'firebase-admin';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { ListingClaimDoc, ReportDoc, Tier } from './types';

// Co-locate all Cloud Functions in asia-south1 (Mumbai)
setGlobalOptions({ region: 'asia-south1' });

admin.initializeApp();
const db = admin.firestore();

// ─── Tier Calculation ────────────────────────────────────────────────────────
const getTierForPoints = (points: number): Tier => {
  if (points >= 10000) return 'Guardian';
  if (points >= 5000) return 'Advocate';
  if (points >= 1000) return 'Resident';
  return 'Tourist';
};

/**
 * Atomically awards civic karma points and recalculates user badge tier.
 */
const awardKarmaPoints = async (uid: string, points: number): Promise<void> => {
  if (!uid || points === 0) return;
  const userRef = db.collection('users').doc(uid);

  try {
    await db.runTransaction(async (t) => {
      const snap = await t.get(userRef);
      if (!snap.exists) return;
      const currentPoints = (snap.data()?.civicPoints ?? 0) as number;
      const nextPoints = currentPoints + points;
      t.update(userRef, {
        civicPoints: admin.firestore.FieldValue.increment(points),
        tier: getTierForPoints(nextPoints),
      });
    });
  } catch (err) {
    console.error(`[awardKarmaPoints] Failed to award ${points} points to ${uid}:`, err);
  }
};

/**
 * Creates an in-app notification in `users/{recipientUid}/notifications`.
 */
const sendNotification = async (
  recipientUid: string,
  payload: {
    type: string;
    reportId?: string;
    listingId?: string;
    fromName?: string;
    message?: string;
  }
): Promise<void> => {
  if (!recipientUid) return;
  const notifRef = db.collection(`users/${recipientUid}/notifications`).doc();

  try {
    await notifRef.set({
      notifId: notifRef.id,
      recipientUid,
      fromUid: 'system',
      fromName: payload.fromName ?? 'ReCiti Community',
      fromPhotoURL: null,
      type: payload.type,
      reportId: payload.reportId ?? null,
      listingId: payload.listingId ?? null,
      message: payload.message ?? null,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error(`[sendNotification] Failed to send notification to ${recipientUid}:`, err);
  }
};

// ─── Trigger 1: onReportUpdated ──────────────────────────────────────────────
/**
 * Automatically monitors civic reports.
 * 1. Flips pending reports to 'verified' when verifiedBy >= 3, awarding Karma points.
 * 2. Flips in_progress fixes to 'resolved' when confirmedBy >= 6, rewarding volunteers (+100).
 */
export const onReportUpdated = onDocumentUpdated('reports/{reportId}', async (event) => {
  const before = event.data?.before.data() as ReportDoc | undefined;
  const after = event.data?.after.data() as ReportDoc | undefined;
  if (!before || !after) return;

  const reportId = event.params.reportId;
  const reportRef = db.collection('reports').doc(reportId);

  const beforeVerifiers = before.verifiedBy ?? [];
  const afterVerifiers = after.verifiedBy ?? [];

  // A. Verification Threshold (3 distinct verifiers)
  if (beforeVerifiers.length < 3 && afterVerifiers.length >= 3 && after.status === 'pending') {
    console.log(`[onReportUpdated] Report ${reportId} reached 3 verifications. Upgrading to verified.`);

    await reportRef.update({
      status: 'verified',
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Award +10 points to the original reporter for filing a community-verified issue
    await awardKarmaPoints(after.reporterId, 10);

    // Send notification to reporter
    await sendNotification(after.reporterId, {
      type: 'report_verified',
      reportId,
      fromName: 'ReCiti Verification Network',
      message: 'Your reported civic issue has been verified by 3 neighbors and escalated to city watch!',
    });
  }

  // B. Resolution Confirmation Threshold (6 distinct verifiers)
  const beforeConfirmed = before.resolutionConfirmedBy ?? [];
  const afterConfirmed = after.resolutionConfirmedBy ?? [];

  if (beforeConfirmed.length < 6 && afterConfirmed.length >= 6 && after.status === 'in_progress') {
    console.log(`[onReportUpdated] Report ${reportId} reached 6 confirmations. Upgrading to resolved.`);

    await reportRef.update({
      status: 'resolved',
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Notify the reporter
    await sendNotification(after.reporterId, {
      type: 'fix_confirmed',
      reportId,
      fromName: 'ReCiti Civic Network',
      message: 'Your resolved fix was confirmed by the community! Issue marked resolved.',
    });

    // Award +100 bonus Karma points to all participating volunteers
    const volunteers = after.volunteeredBy ?? [];
    if (volunteers.length > 0) {
      console.log(`[onReportUpdated] Rewarding ${volunteers.length} volunteers with +100 bonus points each.`);
      await Promise.all(volunteers.map((uid) => awardKarmaPoints(uid, 100)));
    }
  }
});

// ─── Trigger 2: onListingClaimUpdated ────────────────────────────────────────
/**
 * Automatically applies approved directory listing ownership claims and alerts claimants.
 */
export const onListingClaimUpdated = onDocumentUpdated('listing_claims/{claimId}', async (event) => {
  const before = event.data?.before.data() as ListingClaimDoc | undefined;
  const after = event.data?.after.data() as ListingClaimDoc | undefined;
  if (!before || !after) return;

  const { listingId, listingName, claimantUid, status } = after;

  // Claim Approved by Admin
  if (before.status === 'pending' && status === 'approved') {
    console.log(`[onListingClaimUpdated] Claim approved for listing ${listingId} by user ${claimantUid}`);

    // Update directory listing document with verified owner
    await db.collection('directories').doc(listingId).set(
      {
        ownerId: claimantUid,
        isClaimed: true,
        claimStatus: 'verified',
        claimedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Notify claimant
    await sendNotification(claimantUid, {
      type: 'claim_approved',
      listingId,
      fromName: 'ReCiti Municipal Directory',
      message: `Your ownership claim for "${listingName}" has been approved! You can now manage your listing.`,
    });
  }

  // Claim Rejected by Admin
  if (before.status === 'pending' && status === 'rejected') {
    console.log(`[onListingClaimUpdated] Claim rejected for listing ${listingId} by user ${claimantUid}`);

    await sendNotification(claimantUid, {
      type: 'claim_rejected',
      listingId,
      fromName: 'ReCiti Municipal Directory',
      message: `Your ownership claim for "${listingName}" could not be verified. Please contact city support with valid documentation.`,
    });
  }
});

// ─── Cron: cleanupExpiredReportsAndNotices ───────────────────────────────────
/**
 * Nightly scheduled job (runs every 24 hours):
 * - Archives unverified pending reports older than 24 hours that received zero verifications.
 */
export const cleanupExpiredReportsAndNotices = onSchedule('every 24 hours', async () => {
  console.log('[cleanupExpiredReportsAndNotices] Starting nightly maintenance cleanup...');

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const oneDayTimestamp = admin.firestore.Timestamp.fromDate(oneDayAgo);

  try {
    const expiredSnap = await db
      .collection('reports')
      .where('status', '==', 'pending')
      .where('createdAt', '<', oneDayTimestamp)
      .get();

    let archivedCount = 0;
    const batch = db.batch();

    for (const docSnap of expiredSnap.docs) {
      const data = docSnap.data() as ReportDoc;
      if (!data.verifiedBy || data.verifiedBy.length === 0) {
        batch.update(docSnap.ref, {
          status: 'archived',
          archivedReason: 'auto_expired_unverified',
        });
        archivedCount++;
      }
    }

    if (archivedCount > 0) {
      await batch.commit();
      console.log(`[cleanupExpiredReportsAndNotices] Successfully archived ${archivedCount} expired unverified reports.`);
    } else {
      console.log('[cleanupExpiredReportsAndNotices] No expired reports found.');
    }
  } catch (err) {
    console.error('[cleanupExpiredReportsAndNotices] Error running cleanup cron:', err);
  }
});
