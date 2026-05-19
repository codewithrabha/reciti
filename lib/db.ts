import {
  collection, doc, setDoc, getDoc, updateDoc, deleteDoc,
  query, where, getDocs, Timestamp,
  limit, onSnapshot, increment, orderBy,
} from 'firebase/firestore';
import { distanceBetween } from 'geofire-common';
import { db } from './firebase';
import { deleteImageByToken } from './storage';
import { Report, User, TriviaQuestion, Tier } from '@/types';

// Collections
const REPORTS_COL = collection(db, 'reports');
const USERS_COL = collection(db, 'users');
const TRIVIA_COL = collection(db, 'trivia');

// ─── Report lifecycle constants ──────────────────────────────────────────────

/** A report becomes `verified` once this many neighbours verify it. */
export const VERIFICATION_THRESHOLD = 10;

/**
 * A `pending` report with zero verifications is auto-deleted this long after
 * creation. Cleanup is lazy/client-side (see `pruneExpired`) — there is no
 * server cron on Firebase's free plan.
 */
export const REPORT_GRACE_PERIOD_MS = 5 * 60 * 1000;

// ─── Tier Calculation ────────────────────────────────────────────────────────
export const getTierForPoints = (points: number): Tier => {
  if (points >= 300) return 'Guardian';
  if (points >= 150) return 'Advocate';
  if (points >= 50) return 'Resident';
  return 'Tourist';
};

export const TIER_THRESHOLDS: Record<Tier, number> = {
  Tourist: 0,
  Resident: 50,
  Advocate: 150,
  Guardian: 300,
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
    imageDeleteToken: reportData.imageDeleteToken ?? null,
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

/** Permanently deletes a report — its Cloudinary image first, then the doc. */
export const deleteReport = async (report: Report): Promise<void> => {
  if (report.imageDeleteToken) {
    try {
      await deleteImageByToken(report.imageDeleteToken);
    } catch (e) {
      // The token may have expired (~10-min TTL), leaving the image orphaned.
      // Still remove the doc so the report leaves every feed.
      console.warn('[db] Cloudinary image delete failed:', e);
    }
  }
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
