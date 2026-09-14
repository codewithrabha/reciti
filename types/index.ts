import { Timestamp } from 'firebase/firestore';

export type Tier = 'Tourist' | 'Resident' | 'Advocate' | 'Guardian';

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  civicPoints: number;
  tier: Tier;
  pushToken?: string | null;
  completedDailyTrivia: Record<string, string>;
  createdAt?: any;
  joinedAt?: any;
  provider?: 'google' | 'email' | string;
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
  /** UIDs of users who volunteered to help fix this issue (fail reports only). */
  volunteeredBy?: string[];
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
  | 'fix_confirmed'
  | 'volunteer_pledged';

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

export interface StorySlide {
  slideId: string;
  reportId: string;
  /** Owner-authored update text, capped at 280 chars. */
  text: string;
  /** Optional photo URL (Cloudinary CDN). */
  imageUrl?: string | null;
  createdAt: Timestamp;
}

// ─── Business Directory & Services ──────────────────────────────────────────

export type DirectoryCategory =
  | 'shops'
  | 'local_stores'
  | 'hotels'
  | 'institutions'
  | 'healthcare'
  | 'markets'
  | 'services'
  | 'other';

export interface BusinessDirectoryItem {
  id: string;
  name: string;
  category: DirectoryCategory;
  description: string;
  address: string;
  city?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  imageUrl: string;
  imageUrls?: string[];
  rating?: number;
  reviewCount?: number;
  isVerified?: boolean;
  isSponsored?: boolean;
  openingHours?: string;

  // ─── Ownership & Verification ─────────────────────────────────────────────
  ownerId?: string | null;
  isClaimed?: boolean;
  claimStatus?: 'unclaimed' | 'pending' | 'verified';
  claimedAt?: Timestamp | string | null;
}

// ─── Listing Claim Verification ─────────────────────────────────────────────

export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface ListingClaim {
  claimId: string;
  listingId: string;
  listingName: string;
  claimantUid: string;
  claimantName?: string;
  claimantEmail?: string;
  claimantPhone?: string;
  businessProofUrl?: string | null;
  notes?: string;
  status: ClaimStatus;
  createdAt: Timestamp | string;
  reviewedAt?: Timestamp | string | null;
  reviewedBy?: string | null;
}

// ─── Public & City Events ───────────────────────────────────────────────────

export type EventCategory =
  | 'cultural'
  | 'civic'
  | 'sports'
  | 'concerts'
  | 'fairs'
  | 'workshops';

export interface CityEvent {
  id: string;
  title: string;
  category: EventCategory;
  description: string;
  date: string; // e.g. '2026-09-12' or 'Tomorrow, 10:00 AM'
  time: string;
  endDate?: string;
  locationName: string;
  address: string;
  city?: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  price: string; // 'Free' or '₹150' / '$10'
  organizerName: string;
  isSponsored?: boolean;
  civicPointsReward?: number;

  // ─── Organizer Ownership & Verification ───────────────────────────────────
  organizerId?: string | null;
  organizerType?: 'citizen' | 'ngo' | 'business' | 'municipal' | 'admin';
  isVerifiedOrganizer?: boolean;
  contactEmail?: string;
  contactPhone?: string;
  status?: 'active' | 'cancelled' | 'completed';
}

// ─── Digital Notice Board & Civic Bulletins ─────────────────────────────────

export type NoticeCategory =
  | 'alert'
  | 'announcement'
  | 'spotlight'
  | 'advisory'
  | 'app_update'
  | 'banner';

export type NoticePriority = 'urgent' | 'high' | 'normal';
export type NoticeDisplayType = 'standard' | 'image_banner' | 'feature_update';

export interface CityNotice {
  id: string;
  title: string;
  description: string;
  category: NoticeCategory;
  priority: NoticePriority;
  city: string; // e.g., 'Bongaigaon', 'Bengaluru', or 'all'
  badgeText: string; // e.g., 'WATER SUPPLY', 'ROADWORK', 'NEW FEATURE', 'WHAT'S NEW'
  issuedBy: string; // e.g., 'Municipal Board', 'ReCiti Team'
  date: string; // e.g., 'Today, 8:00 AM' or 'v2.1 Update'
  displayType?: NoticeDisplayType;
  imageUrl?: string;
  actionLabel?: string; // e.g., 'Try Now', 'Call Helpline', 'View Circular'
  actionUrl?: string; // Tel URI, external link, or internal route e.g. '/explore'
  actionType?: 'phone' | 'link' | 'route' | 'modal' | 'none';
  isPinned?: boolean;
}
