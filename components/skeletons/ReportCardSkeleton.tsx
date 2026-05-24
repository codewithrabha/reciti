import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { useTheme } from '@/theme';

function OneCard() {
  const { spacing } = useTheme();
  return (
    <Card padding="none" style={{ marginBottom: 16 }}>
      {/* Header */}
      <View style={[styles.header, { padding: spacing.md }]}>
        <View style={styles.headerLeft}>
          <Skeleton width={32} height={32} borderRadius={16} />
          <View style={{ marginLeft: spacing.sm }}>
            <Skeleton width={140} height={14} borderRadius={4} />
            <Skeleton
              width={80}
              height={11}
              borderRadius={4}
              style={{ marginTop: 6 }}
            />
          </View>
        </View>
        <Skeleton width={78} height={22} borderRadius={11} />
      </View>

      {/* Image block */}
      <Skeleton width={'100%'} height={220} borderRadius={0} />

      {/* Description */}
      <View style={{ padding: spacing.sm }}>
        <Skeleton width={'100%'} height={12} borderRadius={4} />
        <Skeleton
          width={'70%'}
          height={12}
          borderRadius={4}
          style={{ marginTop: 6 }}
        />
      </View>
    </Card>
  );
}

interface Props {
  count?: number;
}

export function ReportCardSkeleton({ count = 3 }: Props) {
  return <SkeletonGroup count={count}>{() => <OneCard />}</SkeletonGroup>;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
});
