import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Typography } from '@/components/ui/Typography';
import { Report, ReportStatus } from '@/types';
import { VERIFICATION_THRESHOLD } from '@/lib/db';
import { useTheme } from '@/theme';

type StageState = 'done' | 'current' | 'future';

interface Stage {
  label: string;
  state: StageState;
  time?: Timestamp | null;
  note?: string;
}

// How far along the lifecycle each status sits.
const RANK: Record<ReportStatus, number> = {
  pending: 0,
  verified: 1,
  in_progress: 2,
  resolved: 3,
  archived: 0,
};

function buildStages(report: Report): Stage[] {
  const rank = RANK[report.status];
  const isWin = report.vibe === 'win';
  const verifyLeft = Math.max(
    0,
    VERIFICATION_THRESHOLD - (report.verifiedBy?.length ?? 0),
  );
  const confirmLeft = Math.max(0, 3 - (report.resolutionConfirmedBy?.length ?? 0));

  // Stage i is reached when rank >= i.
  const stateOf = (i: number): StageState =>
    rank >= i ? 'done' : rank === i - 1 ? 'current' : 'future';

  const stages: Stage[] = [
    { label: 'Reported', state: 'done', time: report.createdAt },
  ];

  const vState = stateOf(1);
  stages.push({
    label: isWin ? 'Verified as a win' : 'Verified',
    state: vState,
    time: report.verifiedAt,
    note:
      vState === 'current'
        ? `${verifyLeft} more verification${verifyLeft === 1 ? '' : 's'} needed`
        : undefined,
  });

  if (!isWin) {
    const fState = stateOf(2);
    stages.push({
      label: 'Fix submitted',
      state: fState,
      time: report.resolutionSubmittedAt,
      note: fState === 'current' ? 'Awaiting an “after” photo' : undefined,
    });

    const rState = stateOf(3);
    stages.push({
      label: 'Resolved',
      state: rState,
      time: report.resolvedAt,
      note:
        rState === 'current'
          ? `${confirmLeft} more confirmation${confirmLeft === 1 ? '' : 's'} needed`
          : undefined,
    });
  }

  return stages;
}

export function ResolutionTimeline({ report }: { report: Report }) {
  const { colors } = useTheme();
  const stages = buildStages(report);

  return (
    <View>
      {stages.map((stage, i) => {
        const last = i === stages.length - 1;
        const done = stage.state === 'done';
        const current = stage.state === 'current';

        return (
          <View key={stage.label} style={styles.row}>
            {/* Node + connector */}
            <View style={styles.gutter}>
              <View
                style={[
                  styles.node,
                  done && { backgroundColor: colors.primary, borderColor: colors.primary },
                  current && { backgroundColor: colors.surface, borderColor: colors.primary },
                  !done && !current && {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {done && <Ionicons name="checkmark" size={13} color={colors.white} />}
                {current && (
                  <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                )}
              </View>
              {!last && (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: done ? colors.primary : colors.border },
                  ]}
                />
              )}
            </View>

            {/* Label + meta */}
            <View style={styles.content}>
              <Typography
                variant="body"
                weight={done || current ? 'bold' : 'medium'}
                color={done || current ? colors.text : colors.textMuted}
              >
                {stage.label}
              </Typography>
              {done && stage.time && (
                <Typography variant="caption" color={colors.textMuted}>
                  {formatDistanceToNow(stage.time.toDate(), { addSuffix: true })}
                </Typography>
              )}
              {current && stage.note && (
                <Typography variant="caption" weight="semiBold" color={colors.primary}>
                  {stage.note}
                </Typography>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  gutter: { width: 24, alignItems: 'center' },
  node: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  line: { width: 2, flex: 1, marginVertical: 2 },
  content: { flex: 1, marginLeft: 12, paddingBottom: 20, gap: 1 },
});
