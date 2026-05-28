import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { useUser } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';
import { useTheme } from '@/theme';

const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

type SettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  loading?: boolean;
  isLast?: boolean;
};

function SettingsRow({ icon, label, subtitle, onPress, loading, isLast }: SettingsRowProps) {
  const { colors } = useTheme();
  return (
    <AnimatedButton
      onPress={onPress}
      hapticFeedback="light"
      scaleTo={0.99}
      disabled={loading}
      style={[
        styles.row,
        !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.primaryMuted }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Typography variant="body" weight="medium">
          {label}
        </Typography>
        {!!subtitle && (
          <Typography variant="caption" color={colors.textMuted}>
            {subtitle}
          </Typography>
        )}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.textMuted} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      )}
    </AnimatedButton>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { checking, checkForUpdate } = useAppUpdate();
  const user = useUser();
  const [signingOut, setSigningOut] = useState(false);

  const isSignedIn = !!user && !user.isAnonymous;

  const go = (href: Href) => () => router.push(href);

  const handleCheckUpdate = async () => {
    // A forced/optional result pops the shared update modal; only the
    // "up to date" case needs feedback here.
    const status = await checkForUpdate();
    if (status === 'none') {
      Alert.alert("You're up to date", `ReCiti ${APP_VERSION} is the latest version.`);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.back(); // back to Profile, which now shows the guest state
    } catch {
      Alert.alert('Error', 'Sign out failed. Please try again.');
      setSigningOut(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: handleSignOut },
    ]);
  };

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
          Settings
        </Typography>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Typography
          variant="caption"
          weight="bold"
          color={colors.textMuted}
          style={styles.sectionLabel}
        >
          ABOUT & LEGAL
        </Typography>
        <Card padding="none">
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={go('/privacy-policy')}
          />
          <SettingsRow
            icon="document-text-outline"
            label="Terms & Conditions"
            onPress={go('/terms')}
          />
          <SettingsRow
            icon="information-circle-outline"
            label="About Us"
            onPress={go('/about')}
            isLast
          />
        </Card>

        <Typography
          variant="caption"
          weight="bold"
          color={colors.textMuted}
          style={styles.sectionLabel}
        >
          APP
        </Typography>
        <Card padding="none">
          <SettingsRow
            icon="cloud-download-outline"
            label="Check for updates"
            subtitle={`Current version ${APP_VERSION}`}
            onPress={handleCheckUpdate}
            loading={checking}
            isLast
          />
        </Card>

        {isSignedIn && (
          <>
            <Typography
              variant="caption"
              weight="bold"
              color={colors.textMuted}
              style={styles.sectionLabel}
            >
              ACCOUNT
            </Typography>
            <Card padding="none">
              <AnimatedButton
                onPress={confirmSignOut}
                hapticFeedback="medium"
                scaleTo={0.99}
                disabled={signingOut}
                style={styles.row}
                accessibilityLabel="Sign out"
              >
                <View style={[styles.rowIcon, { backgroundColor: colors.dangerMuted }]}>
                  <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                </View>
                <Typography variant="body" weight="medium" color={colors.danger} style={{ flex: 1 }}>
                  Sign out
                </Typography>
                {signingOut && <ActivityIndicator size="small" color={colors.danger} />}
              </AnimatedButton>
            </Card>
          </>
        )}

        {/* Footer */}
        <View style={[styles.footer, { marginTop: spacing.xl }]}>
          <Typography variant="caption" weight="semiBold" color={colors.textMuted} align="center">
            ReCiti
          </Typography>
          <Typography variant="caption" color={colors.textMuted} align="center">
            Version {APP_VERSION}
          </Typography>
        </View>
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
  sectionLabel: { letterSpacing: 1, marginTop: 16, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 1 },
  footer: { alignItems: 'center', gap: 2 },
});
