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

export interface Report {
  reportId: string;
  reporterId: string;
  imageUrl: string;
  vibe: 'win' | 'fail';
  category: 'waste' | 'traffic' | 'infrastructure';
  status: 'pending' | 'verified' | 'archived';
  latitude: number;
  longitude: number;
  geohash: string;
  verifiedBy: string[];
  flaggedBy: string[];
  createdAt: Timestamp;
}

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  category: string;
  activeDate: string; // 'YYYY-MM-DD'
}
