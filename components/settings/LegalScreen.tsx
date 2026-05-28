import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

export interface LegalSection {
  heading: string;
  body: string;
}

/**
 * Shared scaffold for the in-app legal documents (Privacy Policy, Terms).
 * Renders a back-header, a "last updated" line, an optional intro, and a
 * numbered list of sections. The text itself is supplied by each screen.
 */
export function LegalScreen({
  title,
  lastUpdated,
  intro,
  sections,
}: {
  title: string;
  lastUpdated: string;
  intro?: string;
  sections: LegalSection[];
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
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
          {title}
        </Typography>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Typography variant="caption" color={colors.textMuted}>
          Last updated {lastUpdated}
        </Typography>

        {!!intro && (
          <Typography variant="body" color={colors.text} style={[styles.body, { marginTop: spacing.md }]}>
            {intro}
          </Typography>
        )}

        {sections.map((s, i) => (
          <View key={s.heading} style={{ marginTop: spacing.lg }}>
            <Typography variant="subtitle" weight="bold">
              {i + 1}. {s.heading}
            </Typography>
            <Typography variant="body" color={colors.textMuted} style={[styles.body, { marginTop: spacing.xs }]}>
              {s.body}
            </Typography>
          </View>
        ))}

        <Typography
          variant="caption"
          color={colors.textMuted}
          align="center"
          style={{ marginTop: spacing.xl }}
        >
          This document is a starting template. Replace it with your finalized,
          legally reviewed text before public release.
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
  body: { lineHeight: 24 },
});
