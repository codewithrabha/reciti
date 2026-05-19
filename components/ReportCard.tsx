import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Report } from '@/types';
import { VERIFICATION_THRESHOLD } from '@/lib/db';
import { formatDistanceToNow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './ui/Card';
import { Typography } from './ui/Typography';
import { Badge } from './ui/Badge';
import { AnimatedButton } from './ui/AnimatedButton';
import { useTheme } from '@/theme';

interface ReportCardProps {
  report: Report;
  onVerify?: () => void;
  onFlag?: () => void;
  onPress?: () => void;
  isRadarView?: boolean;
}

export function ReportCard({
  report, onVerify, onFlag, onPress, isRadarView = false,
}: ReportCardProps) {
  const { colors, spacing, radii } = useTheme();
  const isWin = report.vibe === 'win';

  const main = (
    <>
      {/* Header */}
      <View style={[styles.cardHeader, { padding: spacing.md }]}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.iconBadge, { backgroundColor: isWin ? colors.primaryMuted : colors.dangerMuted }]}>
            <Ionicons
              name={isWin ? 'leaf' : 'warning'}
              size={16}
              color={isWin ? colors.primary : colors.danger}
            />
          </View>
          <View style={{ marginLeft: spacing.sm }}>
            <Typography variant="body" weight="semiBold">
              {report.category.charAt(0).toUpperCase() + report.category.slice(1)} {isWin ? 'Win' : 'Issue'}
            </Typography>
            <Typography variant="caption" color={colors.textMuted}>
              {formatDistanceToNow(report.createdAt.toDate(), { addSuffix: true })}
            </Typography>
          </View>
        </View>
        <Badge
          label={isWin ? '+ Civic Win' : '- Civic Fail'}
          variant={isWin ? 'primary' : 'danger'}
        />
      </View>

      {/* Image */}
      {report.imageUrl ? (
        <Image source={{ uri: report.imageUrl }} style={styles.cardImage} contentFit="cover" transition={300} />
      ) : (
        <View style={[styles.cardImagePlaceholder, { backgroundColor: colors.background }]}>
          <Ionicons name="image-outline" size={32} color={colors.border} />
        </View>
      )}
    </>
  );

  return (
    <Card padding="none" style={styles.card}>
      {onPress ? (
        <AnimatedButton onPress={onPress} hapticFeedback="light" scaleTo={0.98}>
          {main}
        </AnimatedButton>
      ) : (
        main
      )}

      {/* Radar Actions */}
      {isRadarView && report.status === 'pending' && (
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          <AnimatedButton
            onPress={onVerify}
            hapticFeedback="success"
            style={[styles.actionBtn, { borderRightColor: colors.border, borderRightWidth: 1 }]}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
            <Typography variant="body" weight="semiBold" color={colors.primary} style={{ marginLeft: spacing.xs }}>
              Verify ({report.verifiedBy.length}/{VERIFICATION_THRESHOLD})
            </Typography>
          </AnimatedButton>
          
          <AnimatedButton
            onPress={onFlag}
            hapticFeedback="medium"
            style={styles.actionBtn}
          >
            <Ionicons name="flag-outline" size={20} color={colors.danger} />
            <Typography variant="body" weight="semiBold" color={colors.danger} style={{ marginLeft: spacing.xs }}>
              Flag
            </Typography>
          </AnimatedButton>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBadge: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  cardImage: { width: '100%', height: 220 },
  cardImagePlaceholder: {
    width: '100%', height: 220, alignItems: 'center', justifyContent: 'center',
  },
  actions: { flexDirection: 'row', borderTopWidth: 1 },
  actionBtn: {
    flex: 1, paddingVertical: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
  },
});
