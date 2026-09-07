import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Report } from '@/types';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useTheme } from '@/theme';

interface VolunteerSectionProps {
  report: Report;
  currentUid: string | null;
  isAnonymous: boolean;
  actionLoading: boolean;
  onToggle: () => void;
}

/**
 * Volunteer section shown on civic issue reports with status 'verified' or 'in_progress'.
 * Lets signed-in users (except the owner) pledge to help fix the issue.
 */
export function VolunteerSection({
  report,
  currentUid,
  isAnonymous,
  actionLoading,
  onToggle,
}: VolunteerSectionProps) {
  const { colors, radii } = useTheme();

  const volunteeredBy = report.volunteeredBy ?? [];
  const volunteerCount = volunteeredBy.length;
  const isOwner = !!currentUid && currentUid === report.reporterId;
  const hasVolunteered = !!currentUid && volunteeredBy.includes(currentUid);

  return (
    <Card padding="lg">
      {/* Header icon + title */}
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primaryMuted }]}>
          <Ionicons name="hand-left" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Typography variant="subtitle" weight="bold">
            {hasVolunteered ? "You're volunteering!" : 'Volunteer to fix this'}
          </Typography>
          <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
            {isOwner
              ? 'Coordinate with volunteers in the discussion below.'
              : hasVolunteered
              ? "You've pledged to help fix this issue. You'll earn +100 bonus points when it's resolved!"
              : "Pledge to help fix this issue and earn Civic Points when it's resolved."}
          </Typography>
        </View>
      </View>

      {/* Volunteer count */}
      {volunteerCount > 0 && (
        <View style={[styles.countRow, { backgroundColor: colors.primaryMuted, borderRadius: radii.sm }]}>
          <Ionicons name="people" size={16} color={colors.primary} />
          <Typography variant="body" weight="semiBold" color={colors.primary} style={{ marginLeft: 6 }}>
            {volunteerCount} {volunteerCount === 1 ? 'neighbour' : 'neighbours'} volunteered
          </Typography>
        </View>
      )}

      {/* Action button — hidden for owner */}
      {!isOwner && (
        <AnimatedButton
          onPress={onToggle}
          disabled={actionLoading}
          hapticFeedback={hasVolunteered ? 'light' : 'success'}
          style={[
            styles.volunteerBtn,
            {
              backgroundColor: hasVolunteered ? colors.surface : colors.primary,
              borderColor: hasVolunteered ? colors.primary : colors.primary,
              borderRadius: radii.md,
            },
          ]}
        >
          <Ionicons
            name={hasVolunteered ? 'checkmark-circle' : 'hand-left-outline'}
            size={20}
            color={hasVolunteered ? colors.primary : '#FFFFFF'}
          />
          <Typography
            variant="body"
            weight="bold"
            color={hasVolunteered ? colors.primary : '#FFFFFF'}
          >
            {hasVolunteered ? "I'm in!" : "I'll help fix this"}
          </Typography>
        </AnimatedButton>
      )}

      {/* Anonymous prompt */}
      {isAnonymous && !isOwner && (
        <Typography variant="caption" color={colors.textMuted} align="center" style={{ marginTop: 8 }}>
          Sign in to volunteer and earn Civic Points.
        </Typography>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  volunteerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1.5,
  },
});
