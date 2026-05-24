import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import { useTheme } from '@/theme';

export function ReportDetailSkeleton() {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Hero image */}
      <Skeleton width={'100%'} height={260} borderRadius={0} />

      <View style={{ padding: spacing.md }}>
        {/* Category + vibe */}
        <View style={styles.headerRow}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <View style={{ marginLeft: spacing.sm, flex: 1 }}>
            <Skeleton width={'60%'} height={18} borderRadius={4} />
            <Skeleton
              width={'40%'}
              height={12}
              borderRadius={4}
              style={{ marginTop: 8 }}
            />
          </View>
          <Skeleton width={86} height={24} borderRadius={12} />
        </View>

        {/* Description block */}
        <View style={{ marginTop: spacing.md }}>
          <Skeleton width={'100%'} height={12} borderRadius={4} />
          <Skeleton
            width={'95%'}
            height={12}
            borderRadius={4}
            style={{ marginTop: 8 }}
          />
          <Skeleton
            width={'60%'}
            height={12}
            borderRadius={4}
            style={{ marginTop: 8 }}
          />
        </View>

        {/* Action buttons */}
        <View style={[styles.actionRow, { marginTop: spacing.lg }]}>
          <Skeleton width={'48%'} height={48} borderRadius={12} />
          <Skeleton width={'48%'} height={48} borderRadius={12} />
        </View>

        {/* Discussion heading */}
        <Skeleton
          width={120}
          height={12}
          borderRadius={4}
          style={{ marginTop: spacing.xl, marginBottom: spacing.md }}
        />

        {/* Comment rows */}
        <SkeletonGroup count={3} gap={spacing.md}>
          {() => (
            <View style={styles.commentRow}>
              <Skeleton width={32} height={32} borderRadius={16} />
              <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                <Skeleton width={'40%'} height={11} borderRadius={4} />
                <Skeleton
                  width={'90%'}
                  height={12}
                  borderRadius={4}
                  style={{ marginTop: 6 }}
                />
                <Skeleton
                  width={'70%'}
                  height={12}
                  borderRadius={4}
                  style={{ marginTop: 6 }}
                />
              </View>
            </View>
          )}
        </SkeletonGroup>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
