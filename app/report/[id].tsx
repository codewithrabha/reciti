import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { Report } from '@/types';
import {
  confirmResolution,
  flagReport,
  getUserDoc,
  submitResolution,
  subscribeToReport,
  verifyReport,
} from '@/lib/db';
import { uploadImage } from '@/lib/storage';
import { useUser } from '@/hooks/useAuth';
import { ResolutionTimeline } from '@/components/report/ResolutionTimeline';
import { BeforeAfter } from '@/components/report/BeforeAfter';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Card } from '@/components/ui/Card';
import { StateView } from '@/components/ui/StateView';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------------------------- small UI pieces ---------------------------- */

function ActionButton({
  icon,
  label,
  tone,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: 'primary' | 'danger';
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors, radii } = useTheme();
  const fg = tone === 'primary' ? colors.primary : colors.danger;
  const bg = tone === 'primary' ? colors.primaryMuted : colors.dangerMuted;
  return (
    <AnimatedButton
      onPress={onPress}
      disabled={disabled}
      hapticFeedback={disabled ? 'none' : tone === 'primary' ? 'success' : 'medium'}
      style={[
        styles.actionBtn,
        { backgroundColor: bg, borderRadius: radii.md },
        disabled && styles.dim,
      ]}
    >
      <Ionicons name={icon} size={20} color={fg} />
      <Typography variant="body" weight="bold" color={fg}>
        {label}
      </Typography>
    </AnimatedButton>
  );
}

function PrimaryButton({
  icon,
  label,
  loading,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors, radii } = useTheme();
  const off = disabled || loading;
  return (
    <AnimatedButton
      onPress={onPress}
      disabled={off}
      hapticFeedback={off ? 'none' : 'success'}
      style={[
        styles.primaryBtn,
        { backgroundColor: colors.primary, borderRadius: radii.md },
        off && styles.dim,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <>
          <Ionicons name={icon} size={20} color={colors.white} />
          <Typography variant="body" weight="bold" color={colors.white}>
            {label}
          </Typography>
        </>
      )}
    </AnimatedButton>
  );
}

function CelebrateBlock({
  icon,
  color,
  bg,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  title: string;
  body: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.celebrate}>
      <View style={[styles.celebrateIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Typography variant="subtitle" weight="bold" align="center">
        {title}
      </Typography>
      <Typography
        variant="caption"
        color={colors.textMuted}
        align="center"
        style={{ marginTop: 4 }}
      >
        {body}
      </Typography>
    </View>
  );
}

/* -------------------------------- screen --------------------------------- */

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useUser();
  const { colors } = useTheme();

  const [report, setReport] = useState<Report | null | undefined>(undefined);
  const [reporterName, setReporterName] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    setError(false);
    return subscribeToReport(id, setReport, () => setError(true));
  }, [id, retryKey]);

  useEffect(() => {
    const reporterId = report?.reporterId;
    if (!reporterId) return;
    let active = true;
    getUserDoc(reporterId).then((u) => {
      if (active) setReporterName(u?.displayName ?? null);
    });
    return () => {
      active = false;
    };
  }, [report?.reporterId]);

  const runAction = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    try {
      await fn();
    } catch {
      Alert.alert('Action failed', 'Something went wrong. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = () => {
    if (user && id) runAction(() => verifyReport(id, user.uid));
  };
  const handleFlag = () => {
    if (user && id) runAction(() => flagReport(id, user.uid));
  };
  const handleConfirm = () => {
    if (user && id) runAction(() => confirmResolution(id, user.uid));
  };

  const pickAndSubmit = async (fromCamera: boolean) => {
    if (!user || !id) return;
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission required',
          `Please grant ${fromCamera ? 'camera' : 'photo library'} access in Settings.`,
        );
        return;
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
          });
      if (result.canceled) return;

      setSubmitting(true);
      const ctx = ImageManipulator.manipulate(result.assets[0].uri);
      ctx.resize({ width: 1024 });
      const rendered = await ctx.renderAsync();
      const compressed = await rendered.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.7,
      });
      const url = await uploadImage(compressed.uri, `reports/${id}_resolved.jpg`);
      await submitResolution(id, user.uid, url);
    } catch {
      Alert.alert('Upload failed', 'Could not submit the fix. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const promptMarkFixed = () => {
    if (!user) return;
    if (user.isAnonymous) {
      Alert.alert(
        'Account required',
        'Create an account to submit a resolution and earn Civic Points.',
        [
          { text: 'Maybe later', style: 'cancel' },
          { text: 'Create account', onPress: () => router.push('/auth/login') },
        ],
      );
      return;
    }
    Alert.alert('Submit the fix', 'Add an “after” photo showing the issue resolved.', [
      { text: 'Take photo', onPress: () => pickAndSubmit(true) },
      { text: 'Choose from gallery', onPress: () => pickAndSubmit(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  /* --------------------------- loading / missing -------------------------- */

  const BackButton = (
    <AnimatedButton
      onPress={() => router.back()}
      hapticFeedback="light"
      style={[styles.backBtn, { top: insets.top + 8 }]}
    >
      <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
    </AnimatedButton>
  );

  if (error) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: colors.background }]}>
        <StateView
          icon="cloud-offline"
          tone="error"
          title="Couldn’t load this report"
          message="Something went wrong. Check your connection and try again."
          actionLabel="Retry"
          onAction={() => setRetryKey((k) => k + 1)}
        />
      </View>
    );
  }

  if (report === undefined) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (report === null) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: colors.background }]}>
        <StateView
          icon="document-outline"
          title="Report not found"
          message="This report may have been removed by the community."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  /* ------------------------------- content -------------------------------- */

  const isWin = report.vibe === 'win';

  const status: { label: string; color: string } = (() => {
    switch (report.status) {
      case 'pending':
        return { label: 'Awaiting verification', color: colors.warning };
      case 'verified':
        return isWin
          ? { label: 'Verified win', color: colors.primary }
          : { label: 'Verified issue', color: colors.danger };
      case 'in_progress':
        return { label: 'Fix in review', color: colors.warning };
      case 'resolved':
        return { label: 'Resolved', color: colors.primary };
      case 'archived':
        return { label: 'Removed', color: colors.textMuted };
      default:
        return { label: report.status, color: colors.textMuted };
    }
  })();

  const renderActions = () => {
    const uid = user?.uid;
    switch (report.status) {
      case 'pending': {
        const alreadyVerified = !!uid && report.verifiedBy.includes(uid);
        const alreadyFlagged = !!uid && report.flaggedBy.includes(uid);
        return (
          <Card padding="lg">
            <Typography variant="subtitle" weight="bold">
              Is this report accurate?
            </Typography>
            <Typography variant="caption" color={colors.textMuted} style={styles.cardSub}>
              Verify reports you can vouch for. Flag anything fake or misplaced.
            </Typography>
            <View style={styles.actionRow}>
              <ActionButton
                icon="checkmark-circle"
                label={
                  alreadyVerified
                    ? 'Verified'
                    : `Verify (${report.verifiedBy.length}/3)`
                }
                tone="primary"
                disabled={alreadyVerified || actionLoading}
                onPress={handleVerify}
              />
              <ActionButton
                icon="flag"
                label={alreadyFlagged ? 'Flagged' : 'Flag'}
                tone="danger"
                disabled={alreadyFlagged || actionLoading}
                onPress={handleFlag}
              />
            </View>
          </Card>
        );
      }
      case 'verified': {
        if (isWin) {
          return (
            <Card padding="lg">
              <CelebrateBlock
                icon="trophy"
                color={colors.primary}
                bg={colors.primaryMuted}
                title="A verified civic win"
                body="Neighbours confirmed this one. Thanks for celebrating the good stuff."
              />
            </Card>
          );
        }
        return (
          <Card padding="lg">
            <Typography variant="subtitle" weight="bold">
              Has this been fixed?
            </Typography>
            <Typography variant="caption" color={colors.textMuted} style={styles.cardSub}>
              If you’ve seen this issue resolved, submit an “after” photo so
              neighbours can confirm the fix.
            </Typography>
            <PrimaryButton
              icon="camera"
              label="Mark as fixed"
              loading={submitting}
              onPress={promptMarkFixed}
            />
          </Card>
        );
      }
      case 'in_progress': {
        const isSubmitter = !!uid && report.resolvedBy === uid;
        const confirmedBy = report.resolutionConfirmedBy ?? [];
        const alreadyConfirmed = !!uid && confirmedBy.includes(uid);
        return (
          <Card padding="lg">
            <Typography variant="subtitle" weight="bold">
              Is the fix real?
            </Typography>
            <Typography variant="caption" color={colors.textMuted} style={styles.cardSub}>
              {isSubmitter
                ? 'You submitted this fix — waiting for neighbours to confirm it.'
                : 'Confirm the “after” photo shows this issue genuinely resolved.'}
            </Typography>
            {!isSubmitter && (
              <PrimaryButton
                icon="checkmark-done"
                label={
                  alreadyConfirmed
                    ? 'You confirmed this fix'
                    : `Confirm the fix (${confirmedBy.length}/3)`
                }
                disabled={alreadyConfirmed || actionLoading}
                onPress={handleConfirm}
              />
            )}
          </Card>
        );
      }
      case 'resolved':
        return (
          <Card padding="lg">
            <CelebrateBlock
              icon="sparkles"
              color={colors.primary}
              bg={colors.primaryMuted}
              title="Resolved!"
              body="This issue was fixed and confirmed by the community — that’s the city pulse getting stronger."
            />
          </Card>
        );
      case 'archived':
        return (
          <Card padding="lg">
            <CelebrateBlock
              icon="trash"
              color={colors.textMuted}
              bg={colors.border}
              title="Removed"
              body="This report was flagged by the community and taken down."
            />
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Hero */}
        <View style={styles.hero}>
          {report.imageUrl ? (
            <Image
              source={{ uri: report.imageUrl }}
              style={styles.heroImage}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View style={[styles.heroImage, styles.center, { backgroundColor: colors.surface }]}>
              <Ionicons name="image-outline" size={48} color={colors.border} />
            </View>
          )}
          {BackButton}
          <View style={[styles.statusPill, { backgroundColor: status.color, bottom: 16 }]}>
            <Typography variant="caption" weight="bold" color="#FFFFFF">
              {status.label}
            </Typography>
          </View>
        </View>

        <View style={styles.body}>
          {/* Meta */}
          <View style={styles.metaRow}>
            <View
              style={[
                styles.vibeIcon,
                { backgroundColor: isWin ? colors.primaryMuted : colors.dangerMuted },
              ]}
            >
              <Ionicons
                name={isWin ? 'leaf' : 'warning'}
                size={18}
                color={isWin ? colors.primary : colors.danger}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Typography variant="h3" weight="bold">
                {cap(report.category)} {isWin ? 'win' : 'issue'}
              </Typography>
              <Typography variant="caption" color={colors.textMuted}>
                Reported by {reporterName ?? 'a neighbour'} ·{' '}
                {formatDistanceToNow(report.createdAt.toDate(), { addSuffix: true })}
              </Typography>
            </View>
          </View>

          {/* Timeline */}
          {report.status !== 'archived' && (
            <>
              <Typography
                variant="caption"
                weight="bold"
                color={colors.textMuted}
                style={styles.sectionLabel}
              >
                RESOLUTION TIMELINE
              </Typography>
              <Card padding="lg">
                <ResolutionTimeline report={report} />
              </Card>
            </>
          )}

          {/* Before / After */}
          {report.resolvedImageUrl ? (
            <>
              <Typography
                variant="caption"
                weight="bold"
                color={colors.textMuted}
                style={styles.sectionLabel}
              >
                BEFORE &amp; AFTER
              </Typography>
              <BeforeAfter
                beforeUrl={report.imageUrl}
                afterUrl={report.resolvedImageUrl}
              />
            </>
          ) : null}

          {/* Contextual actions */}
          <View style={styles.sectionLabel} />
          {renderActions()}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 48 },
  hero: { position: 'relative' },
  heroImage: { width: '100%', height: 290 },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    position: 'absolute',
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  body: { padding: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vibeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: { letterSpacing: 1, marginTop: 24, marginBottom: 10 },
  cardSub: { marginTop: 2, marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  dim: { opacity: 0.5 },
  celebrate: { alignItems: 'center' },
  celebrateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
});
