import {
  collection, doc, setDoc, getDoc, updateDoc, deleteDoc,
  query, where, getDocs, Timestamp,
  limit, onSnapshot, increment, orderBy,
  runTransaction,
} from 'firebase/firestore';
import { distanceBetween } from 'geofire-common';
import { db } from './firebase';
import { Comment, Report, User, TriviaQuestion, Tier } from '@/types';

// Collections
const REPORTS_COL = collection(db, 'reports');
const USERS_COL = collection(db, 'users');
const TRIVIA_COL = collection(db, 'trivia');

// ─── Report lifecycle constants ──────────────────────────────────────────────

/** A report becomes `verified` once this many neighbours verify it. */
export const VERIFICATION_THRESHOLD = 10;

/** A comment is auto-hidden once this many distinct users flag it. */
export const COMMENT_FLAG_THRESHOLD = 3;

/** Civic points awarded when the report's reporter marks a comment as helpful. */
export const HELPFUL_COMMENT_POINTS = 5;

/** Hard cap on comment body length. */
export const COMMENT_MAX_LENGTH = 500;

/** Cap on how many comments a single thread renders in v1 (no pagination yet). */
export const COMMENT_THREAD_CAP = 100;

/**
 * A `pending` report with zero verifications is auto-deleted this long after
 * creation. Cleanup is lazy/client-side (see `pruneExpired`) — there is no
 * server cron on Firebase's free plan.
 */
export const REPORT_GRACE_PERIOD_MS = 60 * 60 * 1000; // 1 hour

// ─── Tier Calculation ────────────────────────────────────────────────────────
export const getTierForPoints = (points: number): Tier => {
  if (points >= 10000) return 'Guardian';
  if (points >= 5000) return 'Advocate';
  if (points >= 1000) return 'Resident';
  return 'Tourist';
};

export const TIER_THRESHOLDS: Record<Tier, number> = {
  Tourist: 0,
  Resident: 1000,
  Advocate: 5000,
  Guardian: 10000,
};

// ─── User ────────────────────────────────────────────────────────────────────

/** Creates or partially updates a user document */
export const createOrUpdateUserDoc = async (uid: string, partial: Partial<User>) => {
  const userRef = doc(USERS_COL, uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      uid,
      displayName: partial.displayName ?? `Citizen_${uid.substring(0, 5)}`,
      email: partial.email ?? null,
      photoURL: partial.photoURL ?? null,
      civicPoints: 0,
      tier: 'Tourist' as Tier,
      completedDailyTrivia: [],
    });
  } else {
    await updateDoc(userRef, partial as Record<string, unknown>);
  }
};

/** Fetches a user document */
export const getUserDoc = async (uid: string): Promise<User | null> => {
  const snap = await getDoc(doc(USERS_COL, uid));
  return snap.exists() ? (snap.data() as User) : null;
};

/** Fetches the top users by civic points — the leaderboard. */
export const getLeaderboard = async (max = 20): Promise<User[]> => {
  const q = query(USERS_COL, orderBy('civicPoints', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as User);
};

/** Awards civic points and recalculates tier */
export const awardPoints = async (uid: string, points: number) => {
  const userRef = doc(USERS_COL, uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;
  const current = snap.data() as User;
  const newPoints = current.civicPoints + points;
  const newTier = getTierForPoints(newPoints);
  await updateDoc(userRef, { civicPoints: increment(points), tier: newTier });
};

// ─── Reports ─────────────────────────────────────────────────────────────────

/** Creates a new report and awards +10 points to reporter */
export const createReport = async (
  reportData: Omit<Report, 'reportId' | 'status' | 'verifiedBy' | 'flaggedBy' | 'createdAt'>
) => {
  const newReportRef = doc(REPORTS_COL);
  const report: Report = {
    ...reportData,
    reportId: newReportRef.id,
    status: 'pending',
    verifiedBy: [],
    flaggedBy: [],
    createdAt: Timestamp.now(),
    description: reportData.description ?? null,
    verifiedAt: null,
    resolutionSubmittedAt: null,
    resolvedAt: null,
    resolvedImageUrl: null,
    resolvedBy: null,
    resolutionConfirmedBy: [],
  };
  await setDoc(newReportRef, report);
  // Award points for submitting
  await awardPoints(report.reporterId, 10);
  return report.reportId;
};

// ─── Lazy cleanup of unverified reports ──────────────────────────────────────

/** True once a pending report has sat with zero verifications past the grace period. */
const isExpiredUnverified = (r: Report): boolean =>
  r.status === 'pending' &&
  r.verifiedBy.length === 0 &&
  Date.now() - r.createdAt.toMillis() > REPORT_GRACE_PERIOD_MS;

/**
 * Permanently deletes a report document.
 *
 * Note: the Cloudinary image is left in place — unsigned uploads give the
 * client no way to delete an asset. Orphaned images need a server-side
 * cleanup using the Cloudinary API secret (see before-production.md).
 */
export const deleteReport = async (report: Report): Promise<void> => {
  await deleteDoc(doc(REPORTS_COL, report.reportId));
};

// Reports whose deletion is already in flight — prevents firing duplicate
// network deletes while the same expired doc keeps arriving in snapshots.
const deletionsInFlight = new Set<string>();

/**
 * Drops unverified reports that have outlived the grace period and fires off
 * their deletion (fire-and-forget — the UI never blocks on it). This is the
 * client-side "lazy cleanup": expired reports are pruned whenever any feed
 * that would surface them is loaded.
 */
const pruneExpired = (reports: Report[]): Report[] => {
  const live: Report[] = [];
  for (const r of reports) {
    if (!isExpiredUnverified(r)) {
      live.push(r);
      continue;
    }
    if (!deletionsInFlight.has(r.reportId)) {
      deletionsInFlight.add(r.reportId);
      void deleteReport(r)
        // A denied/failed delete (e.g. clock skew vs. the rules' time check)
        // is fine — the next snapshot that still contains it will retry.
        .catch((e) => console.warn('[db] report cleanup failed:', e))
        .finally(() => deletionsInFlight.delete(r.reportId));
    }
  }
  return live;
};

/** Fetches all reports by a specific user */
export const getUserReports = async (uid: string): Promise<Report[]> => {
  const q = query(REPORTS_COL, where('reporterId', '==', uid), limit(50));
  const snap = await getDocs(q);
  const reports = pruneExpired(snap.docs.map(d => d.data() as Report));
  reports.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  return reports;
};

/**
 * Verifies a report. At `VERIFICATION_THRESHOLD` verifications → status
 * becomes 'verified'.
 */
export const verifyReport = async (reportId: string, userId: string) => {
  const reportRef = doc(db, 'reports', reportId);
  const reportSnap = await getDoc(reportRef);
  if (reportSnap.exists()) {
    const report = reportSnap.data() as Report;
    if (!report.verifiedBy.includes(userId)) {
      const updatedVerifiedBy = [...report.verifiedBy, userId];
      const justVerified =
        updatedVerifiedBy.length >= VERIFICATION_THRESHOLD && report.status === 'pending';
      const updates: Record<string, unknown> = {
        verifiedBy: updatedVerifiedBy,
        status: justVerified ? 'verified' : report.status,
      };
      if (justVerified) updates.verifiedAt = Timestamp.now();
      await updateDoc(reportRef, updates);
      // Award +5 points to verifier
      await awardPoints(userId, 5);
    }
  }
};

/** Subscribes to a single report in real-time. */
export const subscribeToReport = (
  reportId: string,
  onUpdate: (report: Report | null) => void,
  onError?: (error: Error) => void,
) => {
  return onSnapshot(
    doc(db, 'reports', reportId),
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      const report = snap.data() as Report;
      // An expired, unverified report is treated as already gone — prune it.
      if (isExpiredUnverified(report)) {
        pruneExpired([report]);
        onUpdate(null);
        return;
      }
      onUpdate(report);
    },
    onError,
  );
};

// ─── Resolution (community-observed) ─────────────────────────────────────────

/**
 * Submits an "after" photo for a verified issue → status becomes 'in_progress'.
 * Awards +10 points to the submitter.
 */
export const submitResolution = async (
  reportId: string,
  userId: string,
  resolvedImageUrl: string,
) => {
  const reportRef = doc(db, 'reports', reportId);
  const snap = await getDoc(reportRef);
  if (!snap.exists()) return;
  const report = snap.data() as Report;
  if (report.status !== 'verified') return; // only verified issues can be resolved
  await updateDoc(reportRef, {
    status: 'in_progress',
    resolvedImageUrl,
    resolvedBy: userId,
    resolutionSubmittedAt: Timestamp.now(),
    resolutionConfirmedBy: [],
  });
  await awardPoints(userId, 10);
};

/**
 * Confirms a submitted fix. At 3 confirmations → status becomes 'resolved'.
 * Awards +5 points. The user who submitted the fix cannot confirm it.
 */
export const confirmResolution = async (reportId: string, userId: string) => {
  const reportRef = doc(db, 'reports', reportId);
  const snap = await getDoc(reportRef);
  if (!snap.exists()) return;
  const report = snap.data() as Report;
  if (report.status !== 'in_progress') return;
  if (report.resolvedBy === userId) return; // can't confirm your own fix
  const confirmedBy = report.resolutionConfirmedBy ?? [];
  if (confirmedBy.includes(userId)) return;
  const updatedConfirmedBy = [...confirmedBy, userId];
  const updates: Record<string, unknown> = {
    resolutionConfirmedBy: updatedConfirmedBy,
  };
  if (updatedConfirmedBy.length >= 3) {
    updates.status = 'resolved';
    updates.resolvedAt = Timestamp.now();
  }
  await updateDoc(reportRef, updates);
  await awardPoints(userId, 5);
};

/** Flags a report. At 2 flags → status becomes 'archived'. */
export const flagReport = async (reportId: string, userId: string) => {
  const reportRef = doc(db, 'reports', reportId);
  const reportSnap = await getDoc(reportRef);
  if (reportSnap.exists()) {
    const report = reportSnap.data() as Report;
    if (!report.flaggedBy.includes(userId)) {
      const updatedFlaggedBy = [...report.flaggedBy, userId];
      const newStatus = updatedFlaggedBy.length >= 2 ? 'archived' : report.status;
      await updateDoc(reportRef, { flaggedBy: updatedFlaggedBy, status: newStatus });
    }
  }
};

// ─── Comments ────────────────────────────────────────────────────────────────

const commentsCol = (reportId: string) =>
  collection(db, 'reports', reportId, 'comments');

/** Real-time subscription to a report's discussion thread, oldest first. */
export const subscribeToComments = (
  reportId: string,
  onUpdate: (comments: Comment[]) => void,
  onError?: (error: Error) => void,
) => {
  const q = query(
    commentsCol(reportId),
    orderBy('createdAt', 'asc'),
    limit(COMMENT_THREAD_CAP),
  );
  return onSnapshot(
    q,
    (snap) => onUpdate(snap.docs.map((d) => d.data() as Comment)),
    onError,
  );
};

/** Posts a new comment. Real-account caller only (rules enforce). */
export const submitComment = async (
  reportId: string,
  authorId: string,
  authorName: string,
  text: string,
): Promise<void> => {
  const trimmed = text.trim();
  if (trimmed.length === 0) throw new Error('Comment cannot be empty');
  if (trimmed.length > COMMENT_MAX_LENGTH) throw new Error('Comment too long');
  const ref = doc(commentsCol(reportId));
  const payload: Comment = {
    commentId: ref.id,
    reportId,
    authorId,
    authorName,
    text: trimmed,
    createdAt: Timestamp.now(),
    flaggedBy: [],
    hiddenAt: null,
    deletedAt: null,
    helpful: false,
  };
  await setDoc(ref, payload);
};

/**
 * Flags a comment. Transactional — at `COMMENT_FLAG_THRESHOLD` distinct flags
 * the comment is auto-hidden by setting `hiddenAt`.
 */
export const flagComment = async (
  reportId: string,
  commentId: string,
  uid: string,
): Promise<void> => {
  const ref = doc(commentsCol(reportId), commentId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const c = snap.data() as Comment;
    const flaggedBy = c.flaggedBy ?? [];
    if (flaggedBy.includes(uid)) return;
    const nextFlagged = [...flaggedBy, uid];
    const updates: Record<string, unknown> = { flaggedBy: nextFlagged };
    if (nextFlagged.length >= COMMENT_FLAG_THRESHOLD && !c.hiddenAt) {
      updates.hiddenAt = Timestamp.now();
    }
    tx.update(ref, updates);
  });
};

/** Author-only soft delete. Verifies caller is the author. */
export const deleteOwnComment = async (
  reportId: string,
  commentId: string,
  uid: string,
): Promise<void> => {
  const ref = doc(commentsCol(reportId), commentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const c = snap.data() as Comment;
  if (c.authorId !== uid) throw new Error('Not your comment');
  if (c.deletedAt) return;
  await updateDoc(ref, { deletedAt: Timestamp.now() });
};

/**
 * Lets the report's reporter mark ONE comment as helpful — awards
 * `HELPFUL_COMMENT_POINTS` to the comment's author. Cross-thread uniqueness
 * is enforced via a pre-flight query; per-comment idempotency by the
 * transaction itself. Both writes (helpful flip + points award) happen in a
 * single transaction so a double-tap cannot double-award.
 */
export const markCommentHelpful = async (
  reportId: string,
  commentId: string,
  callerUid: string,
): Promise<void> => {
  // Pre-flight: reporter check.
  const reportRef = doc(db, 'reports', reportId);
  const reportSnap = await getDoc(reportRef);
  if (!reportSnap.exists()) throw new Error('Report not found');
  const report = reportSnap.data() as Report;
  if (report.reporterId !== callerUid) {
    throw new Error('Only the reporter can mark a comment as helpful');
  }

  // Pre-flight: another helpful comment already exists in this thread?
  const existingHelpful = await getDocs(
    query(commentsCol(reportId), where('helpful', '==', true), limit(1)),
  );
  if (!existingHelpful.empty && existingHelpful.docs[0].id !== commentId) {
    throw new Error('Another comment is already marked helpful');
  }

  const commentRef = doc(commentsCol(reportId), commentId);
  await runTransaction(db, async (tx) => {
    const commentSnap = await tx.get(commentRef);
    if (!commentSnap.exists()) throw new Error('Comment not found');
    const c = commentSnap.data() as Comment;
    if (c.helpful === true) return; // idempotent — no double award
    if (c.deletedAt || c.hiddenAt) {
      throw new Error('Cannot mark a hidden or deleted comment as helpful');
    }
    const authorRef = doc(USERS_COL, c.authorId);
    const authorSnap = await tx.get(authorRef);
    if (authorSnap.exists()) {
      const author = authorSnap.data() as User;
      const newPoints = author.civicPoints + HELPFUL_COMMENT_POINTS;
      tx.update(authorRef, {
        civicPoints: increment(HELPFUL_COMMENT_POINTS),
        tier: getTierForPoints(newPoints),
      });
    }
    tx.update(commentRef, { helpful: true });
  });
};

/** Subscribes to reports in real-time based on status and vibe. */
export const subscribeToReports = (
  status: Report['status'],
  vibe: Report['vibe'] | null,
  onUpdate: (reports: Report[]) => void
) => {
  let q;
  if (vibe) {
    q = query(REPORTS_COL, where('status', '==', status), where('vibe', '==', vibe), limit(50));
  } else {
    q = query(REPORTS_COL, where('status', '==', status), limit(50));
  }
  // TODO: Restore orderBy('createdAt', 'desc') once Firebase index propagates.
  return onSnapshot(q, (snapshot) => {
    const reports = pruneExpired(snapshot.docs.map(d => d.data() as Report));
    reports.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    onUpdate(reports);
  });
};

// ─── Pulse / Dashboard ───────────────────────────────────────────────────────

export interface PulseStats {
  /** Non-archived 'fail' reports — issues still standing. */
  openIssues: number;
  /** Non-archived 'win' reports — civic wins logged. */
  wins: number;
  /** Reports awaiting community verification (status 'pending'). */
  pendingVerification: number;
  /** Non-archived reports created in the last 7 days. */
  thisWeek: number;
  /** Non-archived reports created 7–14 days ago — for the trend comparison. */
  lastWeek: number;
}

/** Optional "your area" filter — a radius around a center point. */
interface AreaOptions {
  center?: { latitude: number; longitude: number };
  radiusKm?: number;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** True when a report falls inside the area filter (or when no filter is set). */
const inArea = (report: Report, opts: AreaOptions): boolean => {
  if (!opts.center || opts.radiusKm == null) return true;
  const km = distanceBetween(
    [report.latitude, report.longitude],
    [opts.center.latitude, opts.center.longitude],
  );
  return km <= opts.radiusKm;
};

/** Real-time aggregate stats for the Pulse dashboard, scoped to an optional area. */
export const subscribeToPulseStats = (
  onUpdate: (stats: PulseStats) => void,
  opts: AreaOptions = {},
  onError?: (error: Error) => void,
) => {
  const q = query(REPORTS_COL, limit(200));
  return onSnapshot(q, (snapshot) => {
    const now = Date.now();
    const reports = pruneExpired(snapshot.docs.map((d) => d.data() as Report));
    const stats: PulseStats = {
      openIssues: 0,
      wins: 0,
      pendingVerification: 0,
      thisWeek: 0,
      lastWeek: 0,
    };
    for (const r of reports) {
      if (!inArea(r, opts)) continue;
      if (r.status === 'pending') stats.pendingVerification += 1;
      if (r.status === 'archived') continue;
      if (r.vibe === 'fail') {
        // A resolved issue is no longer "open".
        if (r.status !== 'resolved') stats.openIssues += 1;
      } else {
        stats.wins += 1;
      }
      const age = now - r.createdAt.toMillis();
      if (age < WEEK_MS) stats.thisWeek += 1;
      else if (age < 2 * WEEK_MS) stats.lastWeek += 1;
    }
    onUpdate(stats);
  }, onError);
};

/** Real-time queue of pending reports needing verification, newest first. */
export const subscribeToVerificationQueue = (
  onUpdate: (reports: Report[]) => void,
  opts: AreaOptions & { excludeUid?: string; max?: number } = {},
  onError?: (error: Error) => void,
) => {
  const q = query(REPORTS_COL, where('status', '==', 'pending'), limit(50));
  return onSnapshot(q, (snapshot) => {
    let reports = pruneExpired(snapshot.docs.map((d) => d.data() as Report))
      .filter((r) => r.reporterId !== opts.excludeUid && inArea(r, opts));
    reports.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    if (opts.max != null) reports = reports.slice(0, opts.max);
    onUpdate(reports);
  }, onError);
};

// ─── Explore ─────────────────────────────────────────────────────────────────

/** Explore feed filters. */
export type ExploreFilter = 'all' | 'wins' | 'issues' | 'verify';

/** Real-time Explore feed — reports filtered by area and category, newest first. */
export const subscribeToExploreReports = (
  onUpdate: (reports: Report[]) => void,
  opts: AreaOptions & { filter?: ExploreFilter } = {},
  onError?: (error: Error) => void,
) => {
  const filter = opts.filter ?? 'all';
  const q = query(REPORTS_COL, limit(100));
  return onSnapshot(q, (snapshot) => {
    const reports = pruneExpired(snapshot.docs.map((d) => d.data() as Report))
      .filter((r) => {
        if (!inArea(r, opts)) return false;
        if (filter === 'verify') return r.status === 'pending';
        if (r.status === 'archived') return false;
        if (filter === 'wins') return r.vibe === 'win';
        if (filter === 'issues') return r.vibe === 'fail';
        return true; // 'all'
      });
    reports.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    onUpdate(reports);
  }, onError);
};

// ─── Trivia ──────────────────────────────────────────────────────────────────

/** Fetches today's trivia question from Firestore */
export const getTodayTrivia = async (): Promise<TriviaQuestion | null> => {
  const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
  const q = query(TRIVIA_COL, where('activeDate', '==', today), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as TriviaQuestion;
};

/** Fetches past trivia questions (before today), newest first — the knowledge archive. */
export const getTriviaArchive = async (): Promise<TriviaQuestion[]> => {
  const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
  const q = query(
    TRIVIA_COL,
    where('activeDate', '<', today),
    orderBy('activeDate', 'desc'),
    limit(30),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as TriviaQuestion);
};

/** Submit a trivia answer. Awards +5 points if correct, marks as completed. */
export const submitTriviaAnswer = async (
  uid: string,
  triviaId: string,
  isCorrect: boolean
): Promise<void> => {
  const userRef = doc(USERS_COL, uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;
  const user = snap.data() as User;
  if (user.completedDailyTrivia.includes(triviaId)) return; // already answered

  const updates: Record<string, unknown> = {
    completedDailyTrivia: [...user.completedDailyTrivia, triviaId],
  };
  await updateDoc(userRef, updates);
  if (isCorrect) await awardPoints(uid, 5);
};
