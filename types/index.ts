import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  displayName: string | null;
  civicPoints: number;
  tier: 'Tourist' | 'Local Guide' | 'City Guardian';
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
