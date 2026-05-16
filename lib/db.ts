import { collection, doc, setDoc, getDoc, updateDoc, query, where, getDocs, Timestamp, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { Report, User } from '@/types';

// Reports Collection
const REPORTS_COL = collection(db, 'reports');
// Users Collection
const USERS_COL = collection(db, 'users');

/**
 * Creates a new report in Firestore.
 */
export const createReport = async (reportData: Omit<Report, 'reportId' | 'status' | 'verifiedBy' | 'flaggedBy' | 'createdAt'>) => {
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
  return report.reportId;
};

/**
 * Fetches recent reports based on their status.
 */
export const fetchReportsByStatus = async (status: Report['status'], limitCount: number = 20) => {
  const q = query(
    REPORTS_COL,
    where('status', '==', status),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as Report);
};

/**
 * Verifies a report. If it reaches 3 verifications, it becomes "verified".
 */
export const verifyReport = async (reportId: string, userId: string) => {
  const reportRef = doc(db, 'reports', reportId);
  const reportSnap = await getDoc(reportRef);

  if (reportSnap.exists()) {
    const report = reportSnap.data() as Report;
    if (!report.verifiedBy.includes(userId)) {
      const updatedVerifiedBy = [...report.verifiedBy, userId];
      const newStatus = updatedVerifiedBy.length >= 3 ? 'verified' : report.status;
      
      await updateDoc(reportRef, {
        verifiedBy: updatedVerifiedBy,
        status: newStatus
      });
    }
  }
};

/**
 * Flags a report. If it reaches 2 flags, it becomes "archived".
 */
export const flagReport = async (reportId: string, userId: string) => {
  const reportRef = doc(db, 'reports', reportId);
  const reportSnap = await getDoc(reportRef);

  if (reportSnap.exists()) {
    const report = reportSnap.data() as Report;
    if (!report.flaggedBy.includes(userId)) {
      const updatedFlaggedBy = [...report.flaggedBy, userId];
      const newStatus = updatedFlaggedBy.length >= 2 ? 'archived' : report.status;
      
      await updateDoc(reportRef, {
        flaggedBy: updatedFlaggedBy,
        status: newStatus
      });
    }
  }
};

/**
 * Subscribes to reports in real-time based on status and vibe.
 */
export const subscribeToReports = (
  status: Report['status'],
  vibe: Report['vibe'] | null,
  onUpdate: (reports: Report[]) => void
) => {
  let q;
  if (vibe) {
    q = query(
      REPORTS_COL,
      where('status', '==', status),
      where('vibe', '==', vibe),
      limit(50)
    );
  } else {
    q = query(
      REPORTS_COL,
      where('status', '==', status),
      limit(50)
    );
  }

  // TODO: Restore orderBy('createdAt', 'desc') once Firebase index propagates.
  return onSnapshot(q, (snapshot) => {
    const reports = snapshot.docs.map(doc => doc.data() as Report);
    reports.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    onUpdate(reports);
  });
};
