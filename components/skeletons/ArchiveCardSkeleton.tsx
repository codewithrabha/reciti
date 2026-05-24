import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { useTheme } from '@/theme';

function OneCard() {
  const { spacing } = useTheme();
  return (
    <Card padding="md" style={{ marginBottom: 12 }}>
      <View style={styles.meta}>
        <Skeleton width={72} height={20} borderRadius={10} />
        <Skeleton width={60} height={11} borderRadius={4} />
      </View>
      <View style={{ marginTop: spacing.sm }}>
        <Skeleton width={'100%'} height={14} borderRadius={4} />
        <Skeleton
          width={'80%'}
          height={14}
          borderRadius={4}
          style={{ marginTop: 6 }}
        />
      </View>
      <View style={[styles.answer, { marginTop: 10 }]}>
        <Skeleton width={16} height={16} borderRadius={8} />
        <Skeleton width={'60%'} height={12} borderRadius={4} />
      </View>
    </Card>
  );
}

interface Props {
  count?: number;
}

export function ArchiveCardSkeleton({ count = 5 }: Props) {
  return <SkeletonGroup count={count}>{() => <OneCard />}</SkeletonGroup>;
}

const styles = StyleSheet.create({
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  answer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
