import { Timestamp } from 'firebase/firestore';

export type Tier = 'Tourist' | 'Resident' | 'Advocate' | 'Guardian';

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  civicPoints: number;
  tier: Tier;
  completedDailyTrivia: Record<string, string>;
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
  // Canonical first photo — always set. Pre-existing single-photo reports
  // only have this field; new reports also set `imageUrls`.
  imageUrl: string;
  // Full ordered list of attached photos (1–3). Optional for backwards
  // compatibility with old reports written before multi-photo support.
  imageUrls?: string[];
  vibe: 'win' | 'fail';
  category: 'waste' | 'traffic' | 'infrastructure';
  status: ReportStatus;
  latitude: number;
  longitude: number;
  geohash: string;
  verifiedBy: string[];
  flaggedBy: string[];
  upvotedBy?: string[];
  commentCount?: number;
  createdAt: Timestamp;

  // Optional free-text context for when the image alone isn't enough.
  description?: string | null;

  // City resolved via reverse-geocoding the capture coords (best-effort; may be null).
  city?: string | null;

  // Lifecycle timestamps — set as the report progresses (absent on older reports).
  verifiedAt?: Timestamp | null;
  resolutionSubmittedAt?: Timestamp | null;
  resolvedAt?: Timestamp | null;

  // Community-observed resolution (UX vision §8).
  resolvedImageUrl?: string | null;
  resolvedBy?: string | null;
  resolutionConfirmedBy?: string[];
}

export interface Comment {
  commentId: string;
  reportId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: Timestamp;
  flaggedBy: string[];
  hiddenAt?: Timestamp | null;
  deletedAt?: Timestamp | null;
  helpful?: boolean;
}

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  category: string;
  activeDate: string; // 'YYYY-MM-DD'
}

export type NotificationType =
  | 'report_verified'
  | 'comment_added'
  | 'fix_submitted'
  | 'fix_confirmed';

export interface Notification {
  notifId: string;
  recipientUid: string;
  type: NotificationType;
  reportId: string;
  fromUid: string;
  fromDisplayName: string | null;
  fromIsAnonymous: boolean;
  read: boolean;
  createdAt: Timestamp;
  commentPreview?: string | null;
}
