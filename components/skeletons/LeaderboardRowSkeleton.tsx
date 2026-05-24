import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { useTheme } from '@/theme';

function OneRow() {
  const { colors, radii } = useTheme();
  return (
    <View
      style={[
        styles.row,
        {
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <Skeleton width={28} height={28} borderRadius={14} />
      <Skeleton width={36} height={36} borderRadius={18} />
      <View style={styles.info}>
        <Skeleton width={'60%'} height={14} borderRadius={4} />
        <Skeleton
          width={'40%'}
          height={11}
          borderRadius={4}
          style={{ marginTop: 4 }}
        />
      </View>
      <Skeleton width={36} height={16} borderRadius={4} />
    </View>
  );
}

interface Props {
  count?: number;
}

export function LeaderboardRowSkeleton({ count = 6 }: Props) {
  return <SkeletonGroup count={count}>{() => <OneRow />}</SkeletonGroup>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  info: { flex: 1, gap: 2 },
});
