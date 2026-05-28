import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

const DOES: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'camera', text: 'Capture civic wins and issues around you' },
  { icon: 'people', text: 'Verify and confirm what neighbours report' },
  { icon: 'pulse', text: 'Track your city’s health on the Pulse dashboard' },
  { icon: 'school', text: 'Learn through daily civic trivia' },
];

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();

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
          About Us
        </Typography>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.heroOrb, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="planet" size={40} color={colors.primary} />
          </View>
          <Typography variant="h2" weight="bold" align="center" style={{ marginTop: spacing.md }}>
            ReCiti
          </Typography>
          <View style={[styles.versionPill, { backgroundColor: colors.primaryMuted, borderRadius: radii.full }]}>
            <Typography variant="caption" weight="semiBold" color={colors.primary}>
              Version {APP_VERSION}
            </Typography>
          </View>
        </View>

        {/* Mission */}
        <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionLabel}>
          OUR MISSION
        </Typography>
        <Card padding="lg">
          <Typography variant="body" color={colors.text} style={styles.bodyText}>
            ReCiti turns everyday observations into a shared, community-maintained
            picture of a city’s health. Spot something — a pothole, an overflowing
            bin, a freshly cleaned park — capture it, and let your neighbours verify
            it and follow it through to resolution.
          </Typography>
          <Typography variant="body" color={colors.textMuted} style={[styles.bodyText, { marginTop: spacing.sm }]}>
            We believe civic change starts with people noticing, together. ReCiti is
            built for Indian cities, by and for the citizens who live in them.
          </Typography>
        </Card>

        {/* What you can do */}
        <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionLabel}>
          WHAT YOU CAN DO
        </Typography>
        <Card padding="lg">
          <View style={{ gap: 14 }}>
            {DOES.map((d) => (
              <View key={d.text} style={styles.doRow}>
                <View style={[styles.doIcon, { backgroundColor: colors.primaryMuted }]}>
                  <Ionicons name={d.icon} size={16} color={colors.primary} />
                </View>
                <Typography variant="body" style={{ flex: 1 }}>
                  {d.text}
                </Typography>
              </View>
            ))}
          </View>
        </Card>

        {/* Legal links */}
        <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionLabel}>
          LEGAL
        </Typography>
        <Card padding="none">
          <AnimatedButton
            onPress={() => router.push('/privacy-policy')}
            hapticFeedback="light"
            scaleTo={0.99}
            style={[styles.linkRow, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
          >
            <Typography variant="body" weight="medium" style={{ flex: 1 }}>
              Privacy Policy
            </Typography>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </AnimatedButton>
          <AnimatedButton
            onPress={() => router.push('/terms')}
            hapticFeedback="light"
            scaleTo={0.99}
            style={styles.linkRow}
          >
            <Typography variant="body" weight="medium" style={{ flex: 1 }}>
              Terms & Conditions
            </Typography>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </AnimatedButton>
        </Card>

        {/* Footer */}
        <Typography
          variant="caption"
          color={colors.textMuted}
          align="center"
          style={{ marginTop: spacing.xl }}
        >
          Made for Indian cities · ReCiti v{APP_VERSION}
        </Typography>
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
  versionPill: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  sectionLabel: { letterSpacing: 1, marginTop: 28, marginBottom: 10 },
  bodyText: { lineHeight: 24 },
  doRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  doIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});
