import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { TIER_THRESHOLDS } from '@/lib/db';
import { Tier } from '@/types';
import { useTheme } from '@/theme';

const TIER_ORDER: Tier[] = ['Tourist', 'Resident', 'Advocate', 'Guardian'];

const TIER_ICON: Record<Tier, keyof typeof Ionicons.glyphMap> = {
  Tourist: 'walk',
  Resident: 'home',
  Advocate: 'megaphone',
  Guardian: 'shield-checkmark',
};

const TIER_VERB: Record<Tier, string> = {
  Tourist: 'Arriving',
  Resident: 'Belonging',
  Advocate: 'Speaking up',
  Guardian: 'Looking out',
};

const TIER_MEANING: Record<Tier, string> = {
  Tourist:
    'You’re new here, watching the city through ReCiti’s lens. No pressure to do anything yet — get a feel for what’s happening around you.',
  Resident:
    'You’ve shown up consistently — your reports and verifications mean you’re no longer just passing through. This is the tier where most engaged neighbours settle.',
  Advocate:
    'You’re not just doing your share — you’re championing the city’s reports, verifying what’s real, and helping issues get resolved. You have a voice here.',
  Guardian:
    'The top tier. Guardians watch over the city’s civic health — they spot fakes, confirm fixes, and keep the community honest. It’s vigilance, not authority.',
};

const TIER_NAME_NOTE: Record<Tier, string> = {
  Tourist:
    'The name is meant gently. Even if you’ve lived in your city for years, you’re a Tourist here until you start contributing. It’s a starting line, not a label.',
  Resident:
    'The name borrows from RWA culture — Resident Welfare Associations are how Indian cities organise themselves block by block. Being a ReCiti Resident means you’ve taken your seat at that table.',
  Advocate:
    'In India, “Advocate” is also the formal word for a lawyer. There’s a hint of that in the tier: you can now represent the community’s case, vouching for what deserves attention.',
  Guardian:
    'The name draws on protective archetypes — the dwarapala at a temple gate, the neighbourhood elder who knows everyone. Guardians don’t rule the city. They guard it.',
};

const ACTIONS: { icon: keyof typeof Ionicons.glyphMap; label: string; points: number }[] = [
  { icon: 'camera', label: 'Submit a report', points: 10 },
  { icon: 'checkmark-circle', label: 'Verify a neighbour’s report', points: 5 },
  { icon: 'construct', label: 'Submit a fix (after photo)', points: 10 },
  { icon: 'checkmark-done', label: 'Confirm a fix is real', points: 5 },
  { icon: 'sparkles', label: 'Answer the daily trivia', points: 5 },
];

export default function TiersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, radii, spacing } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <AnimatedButton
          onPress={() => router.back()}
          hapticFeedback="light"
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </AnimatedButton>
        <Typography variant="h3" weight="bold">
          How tiers work
        </Typography>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.heroOrb, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="trophy" size={36} color={colors.primary} />
          </View>
          <Typography variant="h2" weight="bold" align="center" style={{ marginTop: spacing.md }}>
            From Tourist to Guardian
          </Typography>
          <Typography
            variant="body"
            color={colors.textMuted}
            align="center"
            style={{ marginTop: spacing.xs }}
          >
            Every neighbour starts as a Tourist and climbs toward Guardian. The ladder isn’t about points — it’s about how deeply you’ve shown up for your city.
          </Typography>
        </View>

        {/* The arc */}
        <Typography
          variant="caption"
          weight="bold"
          color={colors.textMuted}
          style={styles.sectionLabel}
        >
          THE ARC
        </Typography>
        <Card padding="lg">
          <Typography variant="body" color={colors.text}>
            The four tiers mark four different relationships with your city:
          </Typography>
          <View style={{ marginTop: spacing.md, gap: 10 }}>
            {TIER_ORDER.map((t) => (
              <View key={t} style={styles.arcRow}>
                <View style={[styles.arcDot, { backgroundColor: colors.primary }]} />
                <Typography variant="body" weight="semiBold">
                  {t}
                </Typography>
                <Typography variant="body" color={colors.textMuted}>
                  — {TIER_VERB[t].toLowerCase()}
                </Typography>
              </View>
            ))}
          </View>
        </Card>

        {/* Per-tier deep dive */}
        <Typography
          variant="caption"
          weight="bold"
          color={colors.textMuted}
          style={styles.sectionLabel}
        >
          THE FOUR TIERS
        </Typography>
        <View style={{ gap: 12 }}>
          {TIER_ORDER.map((t) => (
            <Card key={t} padding="lg">
              <View style={styles.tierHeader}>
                <View style={[styles.tierIcon, { backgroundColor: colors.primaryMuted }]}>
                  <Ionicons name={TIER_ICON[t]} size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Typography variant="subtitle" weight="bold">
                    {t}
                  </Typography>
                  <Typography variant="caption" color={colors.textMuted}>
                    {TIER_THRESHOLDS[t].toLocaleString()} points · {TIER_VERB[t]}
                  </Typography>
                </View>
              </View>
              <Typography variant="body" color={colors.text} style={{ marginTop: spacing.md }}>
                {TIER_MEANING[t]}
              </Typography>
              <View
                style={[
                  styles.nameNote,
                  { backgroundColor: colors.background, borderRadius: radii.md },
                ]}
              >
                <Typography variant="caption" weight="bold" color={colors.primary}>
                  WHY THIS NAME
                </Typography>
                <Typography
                  variant="caption"
                  color={colors.textMuted}
                  style={{ marginTop: 4, lineHeight: 19 }}
                >
                  {TIER_NAME_NOTE[t]}
                </Typography>
              </View>
            </Card>
          ))}
        </View>

        {/* How to earn points */}
        <Typography
          variant="caption"
          weight="bold"
          color={colors.textMuted}
          style={styles.sectionLabel}
        >
          HOW TO EARN CIVIC POINTS
        </Typography>
        <Card padding="lg">
          <View style={{ gap: 14 }}>
            {ACTIONS.map((a) => (
              <View key={a.label} style={styles.actionRow}>
                <View style={[styles.actionIcon, { backgroundColor: colors.primaryMuted }]}>
                  <Ionicons name={a.icon} size={16} color={colors.primary} />
                </View>
                <Typography variant="body" style={{ flex: 1 }}>
                  {a.label}
                </Typography>
                <Typography variant="body" weight="bold" color={colors.primary}>
                  +{a.points}
                </Typography>
              </View>
            ))}
          </View>
        </Card>

        {/* What tiers don't do */}
        <Typography
          variant="caption"
          weight="bold"
          color={colors.textMuted}
          style={styles.sectionLabel}
        >
          ONE HONEST NOTE
        </Typography>
        <Card padding="lg">
          <Typography variant="body" color={colors.text}>
            Tiers don’t lock features. A Tourist and a Guardian can use ReCiti exactly the same way — both can report, verify, comment, and confirm fixes.
          </Typography>
          <Typography variant="body" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
            What changes is the badge next to your name — a visible signal of how much you’ve shown up. The climb is the reward.
          </Typography>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: 16, paddingBottom: 48 },
  hero: { alignItems: 'center', paddingVertical: 16 },
  heroOrb: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: { letterSpacing: 1, marginTop: 28, marginBottom: 10 },
  arcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  arcDot: { width: 8, height: 8, borderRadius: 4 },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameNote: {
    marginTop: 14,
    padding: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
