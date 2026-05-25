import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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
  const [infoOpen, setInfoOpen] = useState(false);

  const InfoButton = (
    <AnimatedButton
      onPress={() => setInfoOpen(true)}
      hapticFeedback="light"
      style={styles.infoBtn}
    >
      <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
    </AnimatedButton>
  );

  const InfoModal = (
    <Modal
      transparent
      visible={infoOpen}
      animationType="fade"
      onRequestClose={() => setInfoOpen(false)}
    >
      <Pressable style={styles.modalOverlay} onPress={() => setInfoOpen(false)}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable onPress={() => {}} style={styles.modalCardWrap}>
          <Card padding="lg">
            <View style={styles.modalHeader}>
              <Typography variant="h3" weight="bold">
                How tiers work
              </Typography>
              <AnimatedButton
                onPress={() => setInfoOpen(false)}
                hapticFeedback="light"
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </AnimatedButton>
            </View>
            <Typography variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
              Earn Civic Points by submitting reports, verifying neighbours, confirming fixes, and completing the daily trivia.
            </Typography>
            <Typography variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
              As your points grow, you climb from Tourist to Guardian. Your tier is a badge of your commitment — neighbours see it next to your reports.
            </Typography>
            <View style={{ marginTop: spacing.md, gap: 10 }}>
              {TIER_ORDER.map((t) => (
                <View key={t} style={styles.tierGuideRow}>
                  <View style={[styles.tierBadge, { backgroundColor: colors.primaryMuted }]}>
                    <Ionicons name={TIER_ICON[t]} size={16} color={colors.primary} />
                  </View>
                  <Typography variant="body" weight="semiBold" style={{ flex: 1 }}>
                    {t}
                  </Typography>
                  <Typography variant="caption" color={colors.textMuted}>
                    {TIER_THRESHOLDS[t].toLocaleString()} pts
                  </Typography>
                </View>
              ))}
            </View>
            <Typography variant="caption" color={colors.textMuted} style={{ marginTop: spacing.md }}>
              Tiers don’t lock features — they celebrate your civic climb and signal it to your neighbours.
            </Typography>
            <AnimatedButton
              onPress={() => {
                setInfoOpen(false);
                router.push('/tiers');
              }}
              hapticFeedback="light"
              style={[styles.learnMoreBtn, { backgroundColor: colors.primaryMuted, borderRadius: radii.md }]}
            >
              <Typography variant="body" weight="bold" color={colors.primary}>
                Learn more
              </Typography>
              <Ionicons name="arrow-forward" size={18} color={colors.primary} />
            </AnimatedButton>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );

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
        {InfoButton}
        {InfoModal}
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
          <Typography
            variant="caption"
            weight="semiBold"
            color={colors.primary}
            style={{ marginRight: 28 }}
          >
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

      {InfoButton}
      {InfoModal}
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
  infoBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCardWrap: { width: '100%' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: { padding: 4 },
  tierGuideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  learnMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 16,
  },
});
