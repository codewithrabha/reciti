import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BusinessDirectoryItem, ListingClaim } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Badge } from '@/components/ui/Badge';
import { getCategoryLabel } from '@/lib/directoryService';

export type UserListingItem =
  | { type: 'owned'; listing: BusinessDirectoryItem }
  | { type: 'claim'; claim: ListingClaim };

interface ListingItemRowProps {
  item: UserListingItem;
  isFirst: boolean;
  isLast: boolean;
}

export const ListingItemRow = React.memo(function ListingItemRow({
  item,
  isFirst,
  isLast,
}: ListingItemRowProps) {
  const router = useRouter();
  const { colors, radii } = useTheme();

  const isOwned = item.type === 'owned';
  const listingId = isOwned ? item.listing.id : item.claim.listingId;
  const name = isOwned ? item.listing.name : item.claim.listingName;
  const address = isOwned ? item.listing.address : 'Claimed Business';
  const city = isOwned ? item.listing.city : '';
  const categoryLabel = isOwned ? getCategoryLabel(item.listing.category) : 'Claim';

  const getStatusBadge = () => {
    if (isOwned) {
      return <Badge label="Verified Owner" variant="primary" />;
    }
    const status = item.claim.status;
    if (status === 'approved') return <Badge label="Claim Approved" variant="primary" />;
    if (status === 'rejected') return <Badge label="Claim Rejected" variant="danger" />;
    return <Badge label="Under Review" variant="warning" />;
  };

  const handlePress = () => {
    if (listingId) {
      router.push({ pathname: '/directories/[id]', params: { id: listingId } });
    }
  };

  return (
    <AnimatedButton
      onPress={handlePress}
      hapticFeedback="light"
      scaleTo={0.99}
      style={[
        styles.row,
        { backgroundColor: colors.surface },
        isFirst && { borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
        isLast && { borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg },
        !isFirst && { borderTopColor: colors.border, borderTopWidth: 1 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: isOwned ? `${colors.primary}18` : colors.subscriptionMuted }]}>
        <Ionicons
          name={isOwned ? 'business' : 'shield-checkmark-outline'}
          size={18}
          color={isOwned ? colors.primary : colors.subscription}
        />
      </View>

      <View style={styles.info}>
        <Typography variant="body" weight="semiBold" numberOfLines={1}>
          {name}
        </Typography>
        <Typography variant="caption" color={colors.textMuted} numberOfLines={1}>
          {categoryLabel} {city ? `· ${city}` : address ? `· ${address.split(',')[0]}` : ''}
        </Typography>
      </View>

      {getStatusBadge()}
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 6 }} />
    </AnimatedButton>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 1,
  },
});
