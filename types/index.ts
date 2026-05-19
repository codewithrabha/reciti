import { Timestamp } from 'firebase/firestore';

export type Tier = 'Tourist' | 'Resident' | 'Advocate' | 'Guardian';

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  civicPoints: number;
  tier: Tier;
  completedDailyTrivia: string[];
}

export type ReportStatus =
  | 'pending'
  | 'verified'
  | 'in_progress'
  | 'resolved'
  | 'archived';

export interface Report {
  reportId: string;
  reporterId: string;
  imageUrl: string;
  vibe: 'win' | 'fail';
  category: 'waste' | 'traffic' | 'infrastructure';
  status: ReportStatus;
  latitude: number;
  longitude: number;
  geohash: string;
  verifiedBy: string[];
  flaggedBy: string[];
  createdAt: Timestamp;

  /** Cloudinary delete token for `imageUrl`, captured at upload (~10-min TTL).
   *  Used to remove the media when an unverified report is auto-deleted. */
  imageDeleteToken?: string | null;

  // Lifecycle timestamps — set as the report progresses (absent on older reports).
  verifiedAt?: Timestamp | null;
  resolutionSubmittedAt?: Timestamp | null;
  resolvedAt?: Timestamp | null;

  // Community-observed resolution (UX vision §8).
  resolvedImageUrl?: string | null;
  resolvedBy?: string | null;
  resolutionConfirmedBy?: string[];
}

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  category: string;
  activeDate: string; // 'YYYY-MM-DD'
}
