import { BusinessDirectoryItem, UserEntitlement } from '@/types';

export interface CategorySectionProps {
  business: BusinessDirectoryItem;
  user: any;
  entitlement: UserEntitlement;
  onShare?: () => void;
}
