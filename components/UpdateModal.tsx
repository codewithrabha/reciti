import React from 'react';
import { Linking, Modal, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Card } from '@/components/ui/Card';
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
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onDismiss ?? (() => {})}
    >
      <BlurView intensity={20} tint="dark" style={styles.overlay}>
        <Card style={styles.card} padding="lg">
          <View style={styles.center}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="rocket-outline" size={28} color={colors.primary} />
            </View>
            <Typography variant="h3" weight="bold" align="center" style={{ marginTop: spacing.md }}>
              {forced ? 'Update required' : 'Update available'}
            </Typography>
            <Typography
              variant="body"
              color={colors.textMuted}
              align="center"
              style={{ marginTop: spacing.xs }}
            >
              {forced
                ? `A newer version (${info.latestVersion}) is required to keep using ReCiti.`
                : `Version ${info.latestVersion} is available — you're on ${info.currentVersion}.`}
            </Typography>
          </View>

          {!!info.releaseNotes && (
            <View style={[styles.notes, { backgroundColor: colors.background, borderRadius: radii.md }]}>
              <Typography variant="caption" weight="bold" color={colors.primary}>
                WHAT&apos;S NEW
              </Typography>
              <Typography
                variant="caption"
                color={colors.textMuted}
                style={{ marginTop: 4, lineHeight: 19 }}
              >
                {info.releaseNotes}
              </Typography>
            </View>
          )}

          <AnimatedButton
            onPress={handleUpdate}
            hapticFeedback="medium"
            style={[styles.primaryBtn, { backgroundColor: colors.primary, borderRadius: radii.md }]}
          >
            <Ionicons name="logo-google-playstore" size={18} color="#FFFFFF" />
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
        </Card>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  card: { width: '100%' },
  center: { alignItems: 'center' },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notes: {
    marginTop: 18,
    padding: 12,
  },
  primaryBtn: {
    marginTop: 20,
    paddingVertical: 15,
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
