import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { CityNotice } from '@/types';

export const MOCK_NOTICES: CityNotice[] = [
  // ─── Bongaigaon Notices ───────────────────────────────────────────────────
  {
    id: 'notif-bg-1',
    title: 'Scheduled Water Pipeline Maintenance in Ward 3 & 4',
    description: 'Bongaigaon Municipal Board will carry out pipeline repairs today. Supply will be suspended from 10:00 AM to 3:30 PM. Emergency tankers are available upon request.',
    category: 'alert',
    priority: 'urgent',
    city: 'Bongaigaon',
    badgeText: 'WATER SUPPLY',
    issuedBy: 'Bongaigaon Municipal Board',
    date: 'Active Today • 10 AM - 3:30 PM',
    actionLabel: 'Call Tanker Desk',
    actionUrl: 'tel:18003450000',
    actionType: 'phone',
    isPinned: true,
  },
  {
    id: 'notif-bg-banner',
    title: 'Clean & Green Bongaigaon Initiative',
    description: 'Seasonal afforestation and zero-waste street campaign organized by the district community guild. Join our local volunteer chapters across Ward 1 to 10.',
    category: 'banner',
    displayType: 'image_banner',
    priority: 'high',
    city: 'Bongaigaon',
    badgeText: 'ECO CAMPAIGN',
    issuedBy: 'District Community Guild',
    date: 'Active This Month',
    imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=900&auto=format&fit=crop&q=80',
    actionLabel: 'Campaign Info',
    actionType: 'modal',
  },
  {
    id: 'notif-bg-2',
    title: 'Ward Committee Sanitation & Cleanliness Drive',
    description: 'Join local ward members for a community segregation awareness walk and roadside plastic clearing near Mayapuri. Complimentary recycling bags provided to all participating homes.',
    category: 'announcement',
    priority: 'normal',
    city: 'Bongaigaon',
    badgeText: 'MUNICIPAL DRIVE',
    issuedBy: 'Town Planning & Health Branch',
    date: 'This Sunday • 8:00 AM',
    actionLabel: 'View Circular',
    actionType: 'modal',
  },
  {
    id: 'notif-bg-3',
    title: 'Civic Spotlight: Chapaguri Junction Restored',
    description: 'Citizens reported a dangerous waterlogged pothole via ReCiti 3 days ago. The PWD road repair unit successfully completed macadam patching today.',
    category: 'spotlight',
    priority: 'normal',
    city: 'Bongaigaon',
    badgeText: 'COMMUNITY WIN',
    issuedBy: 'ReCiti Citizen Watch',
    date: 'Resolved Yesterday',
    actionLabel: 'See Impact',
    actionType: 'modal',
  },

  // ─── Bengaluru Notices ────────────────────────────────────────────────────
  {
    id: 'notif-blr-1',
    title: 'Traffic Diversion along MG Road Boulevard',
    description: 'Underground metro utility pipeline testing in progress near Trinity Circle. Light motor vehicles are advised to take Cubbon Road between 11:00 PM and 5:00 AM.',
    category: 'alert',
    priority: 'urgent',
    city: 'Bengaluru',
    badgeText: 'TRAFFIC ADVISORY',
    issuedBy: 'Bengaluru Traffic Police Cell',
    date: 'Active Tonight • 11 PM - 5 AM',
    actionLabel: 'Traffic Helpdesk',
    actionUrl: 'tel:08022942883',
    actionType: 'phone',
    isPinned: true,
  },
  {
    id: 'notif-blr-banner',
    title: 'Namma Bengaluru Lake Protection Summit',
    description: 'Citywide citizen council on waterbody desilting, rainwater catchment, and urban wetland restoration.',
    category: 'banner',
    displayType: 'image_banner',
    priority: 'normal',
    city: 'Bengaluru',
    badgeText: 'LAKE SUMMIT',
    issuedBy: 'Lake Watch Karnataka',
    date: 'Upcoming • Chitrakala Parishath',
    imageUrl: 'https://images.unsplash.com/photo-1511497584788-87676104235f?w=900&auto=format&fit=crop&q=80',
    actionLabel: 'Summit Details',
    actionType: 'modal',
  },
  {
    id: 'notif-blr-2',
    title: 'Property Tax Early Bird 5% Rebate Scheme',
    description: 'BBMP has extended the 5% property tax concession window until the end of this month. Pay online via the official citizen tax portal to claim the rebate.',
    category: 'announcement',
    priority: 'high',
    city: 'Bengaluru',
    badgeText: 'MUNICIPAL REBATE',
    issuedBy: 'BBMP Revenue Department',
    date: 'Deadline: 30 Sept',
    actionLabel: 'Tax Portal',
    actionUrl: 'https://bbmptax.karnataka.gov.in',
    actionType: 'link',
  },
  {
    id: 'notif-blr-3',
    title: 'Monsoon Stormwater Drainage Helpline Active',
    description: 'BBMP emergency monsoon control rooms are functioning 24x7 for tree fall, waterlogging, or blocked culvert clearing across all 8 zones.',
    category: 'advisory',
    priority: 'normal',
    city: 'Bengaluru',
    badgeText: 'DISASTER HELPLINE',
    issuedBy: 'BBMP Disaster Management Cell',
    date: '24/7 Citizen Support',
    actionLabel: 'Dial 1533',
    actionUrl: 'tel:1533',
    actionType: 'phone',
  },

  // ─── Universal / All Cities Broadcast & App Updates ───────────────────────
  {
    id: 'notif-app-1',
    title: 'What’s New in ReCiti: Instant Civic Feed & Map',
    description: 'Track real-time issues and wins around you, upvote verified community reports, and stay updated with the new Digital Notice Board.',
    category: 'app_update',
    displayType: 'feature_update',
    priority: 'high',
    city: 'all',
    badgeText: 'NEW FEATURE',
    issuedBy: 'ReCiti Product Team',
    date: 'Feature Update',
    actionLabel: 'Explore Feed',
    actionUrl: '/(tabs)/explore',
    actionType: 'route',
    isPinned: false,
  },
  {
    id: 'notif-all-1',
    title: 'Emergency Civic Numbers: Quick Reference',
    description: 'Police: 112 • Fire: 101 • Ambulance: 108 • National Disaster Response: 1070. ReCiti automatically attaches geolocation when reporting civic hazards.',
    category: 'advisory',
    priority: 'normal',
    city: 'all',
    badgeText: 'HELPLINES',
    issuedBy: 'ReCiti Citizen Network',
    date: '24/7 Helpline Guide',
    actionLabel: 'Call 112',
    actionUrl: 'tel:112',
    actionType: 'phone',
  },
];

const NOTICES_COL = collection(db, 'city_notices');

export async function getCityNotices(city?: string | null): Promise<CityNotice[]> {
  let list: CityNotice[] = [];

  try {
    const snap = await getDocs(NOTICES_COL);
    if (!snap.empty) {
      list = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<CityNotice, 'id'>),
      }));
    }
  } catch (err) {
    console.warn('[noticeService] Firestore query error, falling back to mock notices:', err);
  }

  // If collection is empty or unreachable, fall back to mock notices
  if (list.length === 0) {
    list = [...MOCK_NOTICES];
  }

  if (city && city.trim().length > 0) {
    const query = city.trim().toLowerCase();
    const matched = list.filter(
      (n) => n.city.toLowerCase() === query || n.city.toLowerCase() === 'all'
    );
    // If local notices exist for this city, use them
    if (matched.length > 0) {
      list = matched;
    }
  }

  // Sort: pinned notices first, then urgent priority, then high, then normal
  const priorityRank: Record<string, number> = { urgent: 3, high: 2, normal: 1 };
  list.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (priorityRank[b.priority] ?? 1) - (priorityRank[a.priority] ?? 1);
  });

  return list;
}
