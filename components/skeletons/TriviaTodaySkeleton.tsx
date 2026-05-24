import React from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { useTheme } from '@/theme';

export function TriviaTodaySkeleton() {
  const { spacing } = useTheme();
  return (
    <Card padding="md">
      {/* Category pill */}
      <Skeleton width={90} height={20} borderRadius={10} />

      {/* Question text (2 lines) */}
      <View style={{ marginTop: spacing.md }}>
        <Skeleton width={'100%'} height={16} borderRadius={4} />
        <Skeleton
          width={'70%'}
          height={16}
          borderRadius={4}
          style={{ marginTop: 8 }}
        />
      </View>

      {/* 4 option blocks */}
      <View style={{ marginTop: spacing.md }}>
        <SkeletonGroup count={4} gap={spacing.sm}>
          {() => <Skeleton width={'100%'} height={52} borderRadius={12} />}
        </SkeletonGroup>
      </View>
    </Card>
  );
}
