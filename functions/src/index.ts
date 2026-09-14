import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { BroadcastNotificationDoc, ListingClaimDoc, ReportDoc, Tier } from './types';

// Co-locate all Cloud Functions in asia-south1 (Mumbai)
setGlobalOptions({ region: 'asia-south1' });

initializeApp();
const db = getFirestore();

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
        civicPoints: FieldValue.increment(points),
        tier: getTierForPoints(nextPoints),
      });
    });
  } catch (err) {
    console.error(`[awardKarmaPoints] Failed to award ${points} points to ${uid}:`, err);
  }
};

/**
 * Dispatches a push notification via Expo Push API to a registered device token.
 */
const sendExpoPushNotification = async (
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken[')) return;

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
      }),
    });
    const result = await res.json();
    console.log('[sendExpoPushNotification] Result:', result);
  } catch (err) {
    console.error('[sendExpoPushNotification] Error sending push notification:', err);
  }
};

/**
 * Creates an in-app notification in `users/{recipientUid}/notifications` and dispatches Expo Push Notification.
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
      createdAt: FieldValue.serverTimestamp(),
    });

    // Check if recipient has a registered Expo Push Token
    const userSnap = await db.collection('users').doc(recipientUid).get();
    const pushToken = userSnap.data()?.pushToken as string | undefined;
    if (pushToken) {
      const title = payload.fromName ?? 'ReCiti Alert';
      const body = payload.message ?? 'You have a new update from ReCiti.';
      await sendExpoPushNotification(pushToken, title, body, {
        reportId: payload.reportId,
        listingId: payload.listingId,
        type: payload.type,
      });
    }
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
      verifiedAt: FieldValue.serverTimestamp(),
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
      resolvedAt: FieldValue.serverTimestamp(),
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
        claimedAt: FieldValue.serverTimestamp(),
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
  const oneDayTimestamp = Timestamp.fromDate(oneDayAgo);

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

// ─── Trigger 3: onBroadcastNotificationCreated ───────────────────────────────
/**
 * Automatically processes queued broadcast notifications written from the Admin Panel.
 * Batches tokens (max 100 per request) and dispatches Expo Push Notifications & In-App records.
 */
export const onBroadcastNotificationCreated = onDocumentCreated('broadcast_notifications/{broadcastId}', async (event) => {
  const snap = event.data;
  if (!snap) return;

  const broadcastId = event.params.broadcastId;
  const broadcastData = snap.data() as BroadcastNotificationDoc | undefined;
  if (!broadcastData || broadcastData.status !== 'pending') return;

  const broadcastRef = db.collection('broadcast_notifications').doc(broadcastId);

  // Mark job as processing
  await broadcastRef.update({
    status: 'processing',
  });

  const {
    title,
    body,
    imageUrl,
    targetAudience,
    targetTier,
    targetUid,
    deepLinkType,
    targetId,
    createdAdminUid,
    createdAdminName,
  } = broadcastData;

  try {
    // 1. Fetch targeted users
    let usersQuery: FirebaseFirestore.Query = db.collection('users');
    if (targetAudience === 'tier' && targetTier) {
      usersQuery = usersQuery.where('tier', '==', targetTier);
    } else if (targetAudience === 'user' && targetUid) {
      usersQuery = usersQuery.where('uid', '==', targetUid);
    }

    const usersSnap = await usersQuery.get();
    if (usersSnap.empty) {
      console.log(`[onBroadcastNotificationCreated] No users found matching filter (audience: ${targetAudience}).`);
      await broadcastRef.update({
        status: 'completed',
        stats: { totalTokens: 0, successCount: 0, failureCount: 0 },
        completedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    // 2. Build push messages & write in-app notification records
    const pushMessages: Array<{
      to: string;
      sound: string;
      title: string;
      body: string;
      data: Record<string, any>;
      attachments?: Array<{ url: string }>;
    }> = [];

    const deepLinkData: Record<string, any> = {
      deepLinkType,
      targetId: targetId ?? null,
      imageUrl: imageUrl ?? null,
    };
    if (deepLinkType === 'report' && targetId) deepLinkData.reportId = targetId;
    if (deepLinkType === 'event' && targetId) deepLinkData.eventId = targetId;
    if (deepLinkType === 'notice' && targetId) deepLinkData.noticeId = targetId;
    if (deepLinkType === 'directory' && targetId) deepLinkData.listingId = targetId;

    let writeBatch = db.batch();
    let batchOperationCount = 0;

    for (const docSnap of usersSnap.docs) {
      const userData = docSnap.data();
      const uid = docSnap.id;

      // Check push token
      const token = userData.pushToken as string | undefined;
      if (token && token.startsWith('ExponentPushToken[')) {
        const msgPayload: any = {
          to: token,
          sound: 'default',
          title: title,
          body: body,
          data: deepLinkData,
        };
        if (imageUrl) {
          msgPayload.attachments = [{ url: imageUrl }];
        }
        pushMessages.push(msgPayload);
      }

      // Create in-app notification document under users/{uid}/notifications
      const notifRef = db.collection(`users/${uid}/notifications`).doc();
      writeBatch.set(notifRef, {
        notifId: notifRef.id,
        recipientUid: uid,
        fromUid: createdAdminUid || 'admin',
        fromName: createdAdminName || 'ReCiti Administration',
        fromPhotoURL: null,
        type: 'broadcast_announcement',
        title: title,
        message: body,
        imageUrl: imageUrl ?? null,
        reportId: deepLinkType === 'report' ? targetId ?? null : null,
        listingId: deepLinkType === 'directory' ? targetId ?? null : null,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      batchOperationCount++;
      if (batchOperationCount >= 450) {
        await writeBatch.commit();
        writeBatch = db.batch();
        batchOperationCount = 0;
      }
    }

    if (batchOperationCount > 0) {
      await writeBatch.commit();
    }

    // 3. Batch send push notifications via Expo API (chunks of 100)
    let successCount = 0;
    let failureCount = 0;

    const chunkSize = 100;
    for (let i = 0; i < pushMessages.length; i += chunkSize) {
      const chunk = pushMessages.slice(i, i + chunkSize);
      try {
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });

        const resData = await res.json();
        if (resData?.data && Array.isArray(resData.data)) {
          for (const item of resData.data) {
            if (item.status === 'ok') {
              successCount++;
            } else {
              failureCount++;
              console.warn('[onBroadcastNotificationCreated] Expo push error item:', item);
            }
          }
        } else {
          failureCount += chunk.length;
        }
      } catch (postErr) {
        console.error('[onBroadcastNotificationCreated] Error dispatching push chunk:', postErr);
        failureCount += chunk.length;
      }
    }

    // 4. Update broadcast document status to completed
    await broadcastRef.update({
      status: 'completed',
      stats: {
        totalTokens: pushMessages.length,
        successCount,
        failureCount,
      },
      completedAt: FieldValue.serverTimestamp(),
    });

    console.log(
      `[onBroadcastNotificationCreated] Successfully dispatched broadcast ${broadcastId}: ` +
        `${pushMessages.length} push tokens targeted (${successCount} succeeded, ${failureCount} failed).`
    );
  } catch (err) {
    console.error(`[onBroadcastNotificationCreated] Failed processing broadcast ${broadcastId}:`, err);
    await broadcastRef.update({
      status: 'failed',
      completedAt: FieldValue.serverTimestamp(),
    });
  }
});
