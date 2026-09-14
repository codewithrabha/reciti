import { Timestamp } from 'firebase-admin/firestore';

export type ReportStatus = 'pending' | 'verified' | 'in_progress' | 'resolved' | 'archived';

export interface ReportDoc {
  reportId: string;
  reporterId: string;
  status: ReportStatus;
  verifiedBy: string[];
  flaggedBy: string[];
  upvotedBy?: string[];
  volunteeredBy?: string[];
  createdAt: Timestamp;
  verifiedAt?: Timestamp | null;
  resolutionSubmittedAt?: Timestamp | null;
  resolvedAt?: Timestamp | null;
  resolvedImageUrl?: string | null;
  resolvedBy?: string | null;
  resolutionConfirmedBy?: string[];
  description?: string | null;
  city?: string | null;
  category?: string;
  vibe?: string;
}

export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface ListingClaimDoc {
  claimId: string;
  listingId: string;
  listingName: string;
  claimantUid: string;
  claimantName?: string;
  claimantEmail?: string;
  claimantPhone?: string;
  status: ClaimStatus;
  createdAt: Timestamp;
  reviewedAt?: Timestamp | null;
  reviewedBy?: string | null;
}

export type Tier = 'Tourist' | 'Resident' | 'Advocate' | 'Guardian';

export interface UserDoc {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  civicPoints: number;
  tier: Tier;
}

export interface NotificationDoc {
  notifId: string;
  recipientUid: string;
  fromUid: string;
  fromName: string;
  fromPhotoURL: string | null;
  type: string;
  reportId?: string;
  listingId?: string;
  title?: string;
  message?: string;
  imageUrl?: string | null;
  read: boolean;
  createdAt: Timestamp;
}

export type TargetAudience = 'all' | 'tier' | 'user';
export type DeepLinkType = 'none' | 'notice' | 'event' | 'report' | 'directory';

export interface BroadcastNotificationDoc {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  targetAudience: TargetAudience;
  targetTier?: Tier;
  targetUid?: string;
  targetName?: string;
  deepLinkType: DeepLinkType;
  targetId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stats?: {
    totalTokens: number;
    successCount: number;
    failureCount: number;
  };
  createdAdminUid: string;
  createdAdminName?: string;
  createdAt: Timestamp;
  completedAt?: Timestamp | null;
}
