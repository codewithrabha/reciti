import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { useTheme } from '@/theme';

function OneComment() {
  const { spacing } = useTheme();
  return (
    <View style={styles.row}>
      <Skeleton width={32} height={32} borderRadius={16} />
      <View style={{ marginLeft: spacing.sm, flex: 1 }}>
        <View style={styles.headRow}>
          <Skeleton width={'35%'} height={12} borderRadius={4} />
          <Skeleton width={48} height={10} borderRadius={4} />
        </View>
        <Skeleton
          width={'100%'}
          height={12}
          borderRadius={4}
          style={{ marginTop: 8 }}
        />
        <Skeleton
          width={'80%'}
          height={12}
          borderRadius={4}
          style={{ marginTop: 6 }}
        />
      </View>
    </View>
  );
}

interface Props {
  count?: number;
}

export function CommentSkeleton({ count = 3 }: Props) {
  const { spacing } = useTheme();
  return (
    <SkeletonGroup count={count} gap={spacing.md}>
      {() => <OneComment />}
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
