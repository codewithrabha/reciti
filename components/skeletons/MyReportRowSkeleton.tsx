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
      <Skeleton width={10} height={10} borderRadius={5} />
      <View style={styles.info}>
        <Skeleton width={'70%'} height={14} borderRadius={4} />
        <Skeleton
          width={'40%'}
          height={11}
          borderRadius={4}
          style={{ marginTop: 5 }}
        />
      </View>
      <Skeleton width={68} height={20} borderRadius={10} />
    </View>
  );
}

interface Props {
  count?: number;
}

export function MyReportRowSkeleton({ count = 4 }: Props) {
  return <SkeletonGroup count={count}>{() => <OneRow />}</SkeletonGroup>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  info: { flex: 1, gap: 2 },
});
