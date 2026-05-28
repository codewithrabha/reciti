import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
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
import { FEEDBACK_MAX_LENGTH, requestAccountDeletion, submitFeedback } from '@/lib/db';
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
  const { colors, spacing, radii } = useTheme();
  const { checking, checkForUpdate } = useAppUpdate();
  const user = useUser();
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

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

  const handleSubmitFeedback = async () => {
    const trimmed = feedbackText.trim();
    if (!trimmed) {
      Alert.alert('Empty feedback', 'Please write something before sending.');
      return;
    }
    if (!user) return;
    setSubmittingFeedback(true);
    try {
      await submitFeedback(user.uid, user.email, user.displayName, trimmed, APP_VERSION);
      setFeedbackVisible(false);
      setFeedbackText('');
      Alert.alert('Thank you!', 'Your feedback has been received.');
    } catch {
      Alert.alert('Error', "Couldn't send your feedback. Please try again.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const closeFeedback = () => {
    if (submittingFeedback) return;
    setFeedbackVisible(false);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await requestAccountDeletion(user.uid, user.email, user.displayName);
      await signOut();
      router.back(); // back to Profile (now guest)
      Alert.alert(
        'Request received',
        'Your account is scheduled for deletion and you have been signed out. This may take a few days to fully process.',
      );
    } catch {
      Alert.alert('Error', "Couldn't submit your request. Please try again.");
      setDeleting(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This requests permanent deletion of your account and data, and signs you out. This cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Request deletion', style: 'destructive', onPress: handleDeleteAccount },
      ],
    );
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

        <Typography
          variant="caption"
          weight="bold"
          color={colors.textMuted}
          style={styles.sectionLabel}
        >
          SUPPORT
        </Typography>
        <Card padding="none">
          <SettingsRow
            icon="chatbubble-ellipses-outline"
            label="Send feedback"
            onPress={() => setFeedbackVisible(true)}
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
                style={[
                  styles.row,
                  { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                ]}
                accessibilityLabel="Sign out"
              >
                <View style={[styles.rowIcon, { backgroundColor: colors.border }]}>
                  <Ionicons name="log-out-outline" size={18} color={colors.text} />
                </View>
                <Typography variant="body" weight="medium" style={{ flex: 1 }}>
                  Sign out
                </Typography>
                {signingOut && <ActivityIndicator size="small" color={colors.textMuted} />}
              </AnimatedButton>
              <AnimatedButton
                onPress={confirmDeleteAccount}
                hapticFeedback="medium"
                scaleTo={0.99}
                disabled={deleting}
                style={styles.row}
                accessibilityLabel="Delete account"
              >
                <View style={[styles.rowIcon, { backgroundColor: colors.dangerMuted }]}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </View>
                <Typography variant="body" weight="medium" color={colors.danger} style={{ flex: 1 }}>
                  Delete account
                </Typography>
                {deleting && <ActivityIndicator size="small" color={colors.danger} />}
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

      <Modal
        transparent
        visible={feedbackVisible}
        animationType="fade"
        onRequestClose={closeFeedback}
      >
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <Card style={styles.modalCard} padding="lg">
            <View style={styles.modalHeader}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.primary} />
              <Typography variant="h3" weight="bold" style={styles.modalTitle}>
                Send feedback
              </Typography>
            </View>
            <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 4 }}>
              Found a bug or have an idea? We&apos;d love to hear it.
            </Typography>
            <TextInput
              value={feedbackText}
              onChangeText={(t) => setFeedbackText(t.slice(0, FEEDBACK_MAX_LENGTH))}
              placeholder="Your feedback…"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={FEEDBACK_MAX_LENGTH}
              editable={!submittingFeedback}
              style={[
                styles.feedbackInput,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  borderRadius: radii.md,
                  color: colors.text,
                },
              ]}
            />
            <Typography variant="caption" color={colors.textMuted} style={styles.modalCounter}>
              {feedbackText.length}/{FEEDBACK_MAX_LENGTH}
            </Typography>
            <View style={styles.modalActions}>
              <AnimatedButton
                onPress={closeFeedback}
                hapticFeedback="light"
                disabled={submittingFeedback}
                style={[
                  styles.modalBtn,
                  { borderColor: colors.border, borderWidth: 1.5, borderRadius: radii.md },
                ]}
              >
                <Typography variant="body" weight="semiBold">
                  Cancel
                </Typography>
              </AnimatedButton>
              <AnimatedButton
                onPress={handleSubmitFeedback}
                hapticFeedback="medium"
                disabled={submittingFeedback || !feedbackText.trim()}
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor:
                      submittingFeedback || !feedbackText.trim() ? colors.border : colors.primary,
                    borderRadius: radii.md,
                  },
                ]}
              >
                {submittingFeedback ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Typography variant="body" weight="bold" color="#FFFFFF">
                    Send
                  </Typography>
                )}
              </AnimatedButton>
            </View>
          </Card>
        </BlurView>
      </Modal>
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

  // Feedback modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: { width: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalTitle: { flex: 1 },
  feedbackInput: {
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
    fontSize: 16,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  modalCounter: { marginTop: 6, textAlign: 'right' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
