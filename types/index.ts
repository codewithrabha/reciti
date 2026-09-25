import { FieldValue, Timestamp } from 'firebase/firestore';

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
  | 'housing_rentals'
  | 'food_dining'
  | 'accommodation'
  | 'healthcare'
  | 'shopping_retail'
  | 'education'
  | 'recreation_entertainment'
  | 'public_services'
  | 'other'
  // Legacy categories for backward compatibility
  | 'shops'
  | 'local_stores'
  | 'hotels'
  | 'institutions'
  | 'markets'
  | 'services';

export type DirectorySubcategory =
  // Housing, To-Let & Student PGs
  | 'pg'
  | 'hostel'
  | 'bhk'
  | 'rk'
  | 'room'
  | 'pg_boys'
  | 'pg_girls'
  | 'pg_coed'
  | 'flats_apartments'
  | 'room_rental'
  // Food & Dining
  | 'restaurants_cafes'
  | 'bakeries_confectioneries'
  | 'street_food'
  // Accommodation & Stay
  | 'hotels_resorts'
  | 'lodges_guesthouses'
  | 'homestays'
  // Healthcare & Medical Services
  | 'hospitals_nursing'
  | 'clinics_doctors'
  | 'pharmacies'
  | 'diagnostics_labs'
  // Shopping & Retail
  | 'grocery_essentials'
  | 'apparel_fashion'
  | 'electronics_mobile'
  | 'automotive'
  | 'furniture_decor'
  // Education & Institutions
  | 'schools_colleges'
  | 'coaching_training'
  | 'libraries_study'
  // Recreation & Entertainment
  | 'parks_playgrounds'
  | 'sports_clubs'
  | 'cinemas_entertainment'
  // Public Services & Utilities
  | 'government_offices'
  | 'banking_finance'
  | 'transportation_transit'
  // Other
  | 'general_services';

export interface BusinessDirectoryItem {
  id: string;
  name: string;
  category: DirectoryCategory;
  subcategory?: DirectorySubcategory | string;
  description: string;
  address: string;
  city?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  googleBusinessUrl?: string;
  imageUrl: string;
  imageUrls?: string[];
  rating?: number;
  reviewCount?: number;
  isVerified?: boolean;
  isSponsored?: boolean;
  openingHours?: string;

  // ─── Housing & Rental Specifics (To-Let / PGs) ────────────────────────────
  monthlyRent?: number;
  securityDeposit?: number;
  maintenanceCharges?: number | string;
  electricityType?: 'included' | 'submeter_unit' | 'separate_bill';
  waterSupply?: '24_hours' | 'timed' | 'borewell';
  parkingType?: 'car_bike' | 'bike_only' | 'street' | 'none';
  amenitiesList?: string[];
  vacancyStatus?: 'available_now' | 'vacating_soon' | 'occupied';
  availableFromDate?: string;
  vacatingTenantNote?: string;
  isZeroBrokerVerified?: boolean;
  landlordName?: string;
  landlordPhone?: string;

  // BHK & Independent Living
  bhkType?: '1_rk' | '1_bhk' | '2_bhk' | '3_bhk' | '4_plus_bhk' | 'studio';
  furnishingStatus?: 'unfurnished' | 'semi_furnished' | 'fully_furnished';
  floorLevel?: string;
  bathroomsCount?: number;
  balconiesCount?: number;
  preferredTenants?: 'all' | 'family_only' | 'bachelors_only' | 'girls_only' | 'boys_only' | 'students_only';
  petsAllowed?: boolean;

  // PG & Hostel Living
  sharingType?: 'single' | 'double' | 'triple' | 'four_plus';
  genderPreference?: 'boys' | 'girls' | 'coed' | 'any';
  bachelorsAllowed?: boolean;
  studentsOnly?: boolean;
  foodIncluded?: boolean;
  foodType?: 'veg_only' | 'veg_nonveg' | 'none';
  foodDetails?: string;
  mealsProvided?: string[];
  curfewTime?: string;
  noticePeriod?: string;

  // Room & RK Living
  washroomType?: 'attached' | 'common';
  kitchenSetup?: 'private' | 'shared' | 'none';

  // ─── Ownership & Verification ─────────────────────────────────────────────
  ownerId?: string | null;
  isClaimed?: boolean;
  claimStatus?: 'unclaimed' | 'pending' | 'verified';
  claimedAt?: Timestamp | string | null;
}

// ─── User Entitlements & Housing Access ─────────────────────────────────────

export type UnlockMethod = 'referral' | 'stay_intel' | 'subscription' | 'civic_points';

export interface UserEntitlement {
  uid: string;
  isUnlocked: boolean;
  unlockedVia?: UnlockMethod;
  validUntil?: Timestamp | string | null;
  housingAccessExpiresAt?: Timestamp | number | null;
  referralCount: number;
  referralsQualifiedCount?: number;
  stayIntelSubmittedId?: string | null;
  createdAt?: Timestamp | string | FieldValue;
  updatedAt?: Timestamp | string | FieldValue;
}

// ─── Referral Audit Ledger ──────────────────────────────────────────────────

export type ReferralContext = 'rental_mission' | 'general_civic';
export type ReferralStatus = 'pending' | 'qualified' | 'rejected';

export interface ReferralEvent {
  id: string; // Idempotent key: `${referrerUid}_${referredUid}`
  referrerUid: string;
  referredUid: string;
  referralCode: string;
  context: ReferralContext;
  status: ReferralStatus;
  rejectionReason?: 'self_referral' | 'existing_account' | 'same_device' | 'duplicate';
  createdAt: Timestamp | string;
  qualifiedAt?: Timestamp | string | null;
  rewardGranted?: boolean;
}

// ─── Stay Intel (Crowdsourced Tenant Vacancy) ───────────────────────────────

export interface StayIntelSubmission {
  id: string;
  submitterUid: string;
  submitterName?: string;
  propertyType: DirectorySubcategory | string;
  propertyName?: string;
  locality: string;
  city?: string;
  monthlyRent: number;
  securityDeposit?: number;
  foodIncluded: boolean;
  curfewTime?: string;
  vacatingSoon: boolean;
  moveOutDate?: string;
  vacatingNote?: string;
  landlordName: string;
  landlordPhone: string;
  status: 'active' | 'archived';
  createdAt: Timestamp | string | FieldValue;
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
  | 'cultural_religious'
  | 'sports_tournaments'
  | 'business_trade_community'
  | 'entertainment_arts'
  | 'social_public_awareness'
  // Legacy categories for backward compatibility
  | 'cultural'
  | 'civic'
  | 'sports'
  | 'concerts'
  | 'fairs'
  | 'workshops'
  | 'other';

export type EventSubcategory =
  // Cultural & Religious Festivals
  | 'pujas_celebrations'
  | 'folk_festivals'
  | 'processions_gatherings'
  // Sports & Tournaments
  | 'leagues_championships'
  | 'marathons_walks'
  | 'traditional_sports'
  // Business, Trade & Community
  | 'trade_fairs_expos'
  | 'business_inaugurations'
  | 'networking_workshops'
  // Entertainment & Arts
  | 'music_concerts_gigs'
  | 'plays_drama_theatre'
  | 'art_photo_exhibitions'
  // Social & Public Awareness
  | 'health_wellness_camps'
  | 'civic_environmental_drives'
  | 'gov_public_outreach'
  | 'general_events';

export interface CityEvent {
  id: string;
  title: string;
  category: EventCategory;
  subcategory?: EventSubcategory;
  subcategoryLabel?: string;
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
  rating?: number;
  reviewCount?: number;

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

// ─── Global Ratings & Reviews ───────────────────────────────────────────────

export type ReviewTargetType = 'directory' | 'event';

export interface Review {
  reviewId: string;
  targetId: string;
  targetType: ReviewTargetType;
  targetTitle?: string;
  userId: string;
  userName: string;
  userPhotoURL?: string | null;
  rating: number; // 1 to 5
  title?: string;
  comment: string;
  tags?: string[];
  likes: string[]; // UIDs of users who marked this review helpful
  createdAt: Timestamp | string;
  updatedAt?: Timestamp | string | null;
}

// ─── Scalable User Bookmarks / Saved ────────────────────────────────────────

export type BookmarkItemType = 'directory' | 'housing' | 'event';

export interface UserBookmark {
  id: string; // matches targetId for O(1) reads
  targetId: string;
  itemType: BookmarkItemType;
  title: string;
  subtitle?: string;
  category?: string;
  imageUrl?: string;
  address?: string;
  city?: string;
  // Compact preview metadata for instant rendering without N+1 fetches
  extraMeta?: {
    priceTag?: string;
    monthlyRent?: number;
    bhkType?: string;
    sharingType?: string;
    eventDate?: string;
    venueName?: string;
    vacancyStatus?: string;
    rating?: number;
  };
  savedAt: number; // Unix timestamp for efficient sorting
}

export interface BookmarkableItem {
  targetId: string;
  itemType: BookmarkItemType;
  title: string;
  subtitle?: string;
  category?: string;
  imageUrl?: string;
  address?: string;
  city?: string;
  extraMeta?: {
    priceTag?: string;
    monthlyRent?: number;
    bhkType?: string;
    sharingType?: string;
    eventDate?: string;
    venueName?: string;
    vacancyStatus?: string;
    rating?: number;
  };
}
