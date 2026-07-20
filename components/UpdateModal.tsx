import React from 'react';
import { Linking, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Typography } from '@/components/ui/Typography';
import { UpdateInfo } from '@/lib/remoteConfig';
import { useTheme } from '@/theme';

/**
 * Update prompt. When `onDismiss` is omitted the update is treated as forced:
 * the "Later" button is hidden and the Android back button can't close it.
 */
export function UpdateModal({
  visible,
  info,
  onDismiss,
}: {
  visible: boolean;
  info: UpdateInfo;
  onDismiss?: () => void;
}) {
  const { colors, spacing, radii } = useTheme();
  const forced = !onDismiss;

  const handleUpdate = async () => {
    if (!info.storeUrl) return;
    try {
      await Linking.openURL(info.storeUrl);
    } catch {
      // Nothing actionable — the user can still update from the store manually.
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onDismiss ?? (() => {})}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          {!forced ? (
            <AnimatedButton
              onPress={onDismiss}
              hapticFeedback="light"
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </AnimatedButton>
          ) : (
            <View style={styles.closeBtnPlaceholder} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centerContent}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="rocket-outline" size={44} color={colors.primary} />
            </View>
            <Typography variant="h2" weight="bold" align="center" style={{ marginTop: spacing.lg }}>
              {forced ? 'Update required' : 'Update available'}
            </Typography>
            <Typography
              variant="body"
              color={colors.textMuted}
              align="center"
              style={{ marginTop: spacing.xs, paddingHorizontal: spacing.md }}
            >
              {forced
                ? `A newer version (${info.latestVersion}) is required to keep using ReCiti.`
                : `Version ${info.latestVersion} is available — you're on ${info.currentVersion}.`}
            </Typography>

            {!!info.releaseNotes && (
              <View style={[styles.notes, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
                <Typography variant="caption" weight="bold" color={colors.primary}>
                  WHAT&apos;S NEW
                </Typography>
                <Typography
                  variant="body"
                  color={colors.textMuted}
                  style={{ marginTop: 6, lineHeight: 22 }}
                >
                  {info.releaseNotes}
                </Typography>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingHorizontal: spacing.lg, paddingBottom: spacing.md }]}>
          <AnimatedButton
            onPress={handleUpdate}
            hapticFeedback="medium"
            style={[styles.primaryBtn, { backgroundColor: colors.primary, borderRadius: radii.md }]}
          >
            <Ionicons name="logo-google-playstore" size={20} color="#FFFFFF" />
            <Typography variant="body" weight="bold" color="#FFFFFF">
              Update now
            </Typography>
          </AnimatedButton>

          {!forced && (
            <AnimatedButton onPress={onDismiss} hapticFeedback="light" style={styles.laterBtn}>
              <Typography variant="body" weight="semiBold" color={colors.textMuted}>
                Later
              </Typography>
            </AnimatedButton>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnPlaceholder: {
    height: 40,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  centerContent: {
    alignItems: 'center',
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notes: {
    width: '100%',
    marginTop: 24,
    padding: 16,
    borderWidth: 1,
  },
  footer: {
    paddingTop: 12,
  },
  primaryBtn: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  laterBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
