import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/theme';

function StatCardSkeleton() {
  const { colors, radii, shadows, spacing } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md },
        shadows.sm,
      ]}
    >
      <Skeleton width={36} height={36} borderRadius={18} style={{ marginBottom: 10 }} />
      <Skeleton width={56} height={26} borderRadius={6} style={{ marginBottom: 6 }} />
      <Skeleton width={'70%'} height={12} borderRadius={4} />
    </View>
  );
}

export function PulseStatsSkeleton() {
  const { spacing } = useTheme();
  return (
    <View>
      {/* Hero placeholder */}
      <View style={{ marginTop: spacing.md }}>
        <Skeleton width={'100%'} height={120} borderRadius={16} />
      </View>

      {/* 2 × 2 stat grid */}
      <View style={[styles.row, { marginTop: spacing.md }]}>
        <StatCardSkeleton />
        <StatCardSkeleton />
      </View>
      <View style={styles.row}>
        <StatCardSkeleton />
        <StatCardSkeleton />
      </View>

      {/* Tier progress placeholder */}
      <View style={{ marginTop: spacing.md }}>
        <Skeleton width={'100%'} height={88} borderRadius={16} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card: { flex: 1 },
});
