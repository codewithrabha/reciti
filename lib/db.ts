import {
  collection, doc, setDoc, getDoc, updateDoc,
  query, where, getDocs, Timestamp,
  limit, onSnapshot, increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { Report, User, TriviaQuestion, Tier } from '@/types';

// Collections
const REPORTS_COL = collection(db, 'reports');
const USERS_COL = collection(db, 'users');
const TRIVIA_COL = collection(db, 'trivia');

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
  };
  await setDoc(newReportRef, report);
  // Award points for submitting
  await awardPoints(report.reporterId, 10);
  return report.reportId;
};

/** Fetches all reports by a specific user */
export const getUserReports = async (uid: string): Promise<Report[]> => {
  const q = query(REPORTS_COL, where('reporterId', '==', uid), limit(50));
  const snap = await getDocs(q);
  const reports = snap.docs.map(d => d.data() as Report);
  reports.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  return reports;
};

/** Verifies a report. At 3 verifications → status becomes 'verified'. */
export const verifyReport = async (reportId: string, userId: string) => {
  const reportRef = doc(db, 'reports', reportId);
  const reportSnap = await getDoc(reportRef);
  if (reportSnap.exists()) {
    const report = reportSnap.data() as Report;
    if (!report.verifiedBy.includes(userId)) {
      const updatedVerifiedBy = [...report.verifiedBy, userId];
      const newStatus = updatedVerifiedBy.length >= 3 ? 'verified' : report.status;
      await updateDoc(reportRef, { verifiedBy: updatedVerifiedBy, status: newStatus });
      // Award +5 points to verifier
      await awardPoints(userId, 5);
    }
  }
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
    const reports = snapshot.docs.map(d => d.data() as Report);
    reports.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    onUpdate(reports);
  });
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
