export interface ResidentPassBenefit {
  id: string;
  icon: 'call' | 'shield-checkmark' | 'flash' | 'ribbon' | 'notifications' | 'document-text' | 'people';
  title: string;
  description: string;
}

export interface ResidentPassConfig {
  price: number;
  periodLabel: string;
  priceDisplay: string;
  priceTag: string;
  monthlyEquivalent: string;
  ctaButtonText: string;
  activeBenefits: ResidentPassBenefit[];
}

export const RESIDENT_PASS_CONFIG: ResidentPassConfig = {
  price: 350,
  periodLabel: 'Year',
  priceDisplay: '₹350',
  priceTag: '₹350 / Year',
  monthlyEquivalent: 'Under ₹30/month',
  ctaButtonText: 'Get Resident Pass · ₹350/Year',
  activeBenefits: [
    {
      id: 'direct_owner_access',
      icon: 'call',
      title: 'Unlimited Landlord Contact',
      description: 'Always-on direct calling & WhatsApp with exact GPS coordinates for all listings across the city.',
    },
    {
      id: 'zero_brokerage_guarantee',
      icon: 'shield-checkmark',
      title: 'Zero Brokerage Guarantee',
      description: 'The true No Broker promise: every listing is verified to be Owner-Only. No hidden brokers, no service charges.',
    },
    {
      id: 'instant_bypass',
      icon: 'flash',
      title: 'Instant Benefits',
      description: 'Instant direct access without needing to invite 3 friends or submit current stay details.',
    },
    {
      id: 'tenant_tools',
      icon: 'ribbon',
      title: 'Smart Tenant Tools',
      description: 'Access to Rent Receipts, Bill Splits, and other tools to simplify your tenant experience.',
    },
  ],
};
