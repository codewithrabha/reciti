import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { TIER_THRESHOLDS } from '@/lib/db';
import { Tier, User } from '@/types';
import { useTheme } from '@/theme';

const TIER_ORDER: Tier[] = ['Tourist', 'Resident', 'Advocate', 'Guardian'];
const TIER_ICON: Record<Tier, keyof typeof Ionicons.glyphMap> = {
  Tourist: 'walk',
  Resident: 'home',
  Advocate: 'megaphone',
  Guardian: 'shield-checkmark',
};

interface TierProgressProps {
  userDoc: User | null;
}

export function TierProgress({ userDoc }: TierProgressProps) {
  const { colors, radii, spacing } = useTheme();
  const router = useRouter();

  // Guests / anonymous users have no tier yet.
  if (!userDoc) {
    return (
      <Card padding="lg">
        <View style={styles.row}>
          <View style={[styles.tierIcon, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="trophy" size={20} color={colors.primary} />
          </View>
          <View style={styles.rowText}>
            <Typography variant="subtitle" weight="bold">
              Start your climb
            </Typography>
            <Typography variant="caption" color={colors.textMuted}>
              Sign in to earn Civic Points and rise from Tourist to Guardian.
            </Typography>
          </View>
        </View>
        <AnimatedButton
          onPress={() => router.push('/auth/login')}
          hapticFeedback="medium"
          style={[styles.cta, { backgroundColor: colors.primary, borderRadius: radii.md }]}
        >
          <Typography variant="body" weight="bold" color={colors.white}>
            Sign in
          </Typography>
        </AnimatedButton>
      </Card>
    );
  }

  const { tier, civicPoints: points } = userDoc;
  const idx = TIER_ORDER.indexOf(tier);
  const isMax = idx >= TIER_ORDER.length - 1;
  const nextTier = isMax ? null : TIER_ORDER[idx + 1];
  const base = TIER_THRESHOLDS[tier];
  const target = nextTier ? TIER_THRESHOLDS[nextTier] : base;
  const progress = isMax
    ? 1
    : Math.max(0, Math.min(1, (points - base) / (target - base)));
  const toNext = isMax ? 0 : target - points;

  return (
    <Card padding="lg">
      <View style={styles.row}>
        <View style={[styles.tierIcon, { backgroundColor: colors.primaryMuted }]}>
          <Ionicons name={TIER_ICON[tier]} size={20} color={colors.primary} />
        </View>
        <View style={styles.rowText}>
          <Typography variant="subtitle" weight="bold">
            {tier}
          </Typography>
          <Typography variant="caption" color={colors.textMuted}>
            {points} Civic {points === 1 ? 'Point' : 'Points'}
          </Typography>
        </View>
        {!isMax && nextTier && (
          <Typography variant="caption" weight="semiBold" color={colors.primary}>
            {toNext} to {nextTier}
          </Typography>
        )}
      </View>

      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            { backgroundColor: colors.primary, width: `${progress * 100}%` },
          ]}
        />
      </View>

      <Typography
        variant="caption"
        color={colors.textMuted}
        style={{ marginTop: spacing.sm }}
      >
        {isMax
          ? 'Top tier reached — you’re a Guardian of your city.'
          : `Keep reporting and verifying to reach ${nextTier}.`}
      </Typography>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1, gap: 1 },
  tierIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    height: 10,
    borderRadius: 9999,
    overflow: 'hidden',
    marginTop: 16,
  },
  fill: { height: 10, borderRadius: 9999 },
  cta: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
});
