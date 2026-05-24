import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { useTheme } from '@/theme';

function OneRow() {
  const { spacing } = useTheme();
  return (
    <View style={styles.row}>
      <Skeleton width={36} height={36} borderRadius={18} />
      <View style={{ marginLeft: spacing.sm, flex: 1 }}>
        <Skeleton width={'80%'} height={13} borderRadius={4} />
        <Skeleton
          width={'55%'}
          height={11}
          borderRadius={4}
          style={{ marginTop: 6 }}
        />
      </View>
      <Skeleton width={36} height={10} borderRadius={4} />
    </View>
  );
}

interface Props {
  count?: number;
}

export function NotificationRowSkeleton({ count = 6 }: Props) {
  const { spacing } = useTheme();
  return (
    <SkeletonGroup count={count} gap={spacing.md}>
      {() => <OneRow />}
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
