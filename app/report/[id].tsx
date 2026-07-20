import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import RAnimated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { Report } from '@/types';
import {
  addReportPhoto,
  confirmResolution,
  flagReport,
  getUserDoc,
  submitResolution,
  subscribeToReport,
  toggleUpvoteReport,
  verifyReport,
  VERIFICATION_THRESHOLD,
  RESOLUTION_CONFIRMATION_THRESHOLD,
} from '@/lib/db';
import { uploadImage } from '@/lib/storage';
import { useUser } from '@/hooks/useAuth';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { ResolutionTimeline } from '@/components/report/ResolutionTimeline';
import { BeforeAfter } from '@/components/report/BeforeAfter';
import { CommentThread } from '@/components/report/CommentThread';
import { CommentComposer } from '@/components/report/CommentComposer';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Card } from '@/components/ui/Card';
import { StateView } from '@/components/ui/StateView';
import { Typography } from '@/components/ui/Typography';
import { ReportDetailSkeleton } from '@/components/skeletons';
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
  const keyboardHeight = useKeyboardHeight();
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const contentHeight = useRef(0);
  const viewportHeight = useRef(0);
  const scrollAnim = useRef(new Animated.Value(0)).current;

  const [report, setReport] = useState<Report | null | undefined>(undefined);
  const [reporterName, setReporterName] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleAddPhoto = () => {
    if (!user || !report || user.uid !== report.reporterId) return;
    const gallery = report.imageUrls && report.imageUrls.length > 0
      ? report.imageUrls
      : (report.imageUrl ? [report.imageUrl] : []);
    if (gallery.length >= 3) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 3 photos per report.');
      return;
    }

    Alert.alert(
      'Add Photo',
      'Choose how you would like to add a photo to your report:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: () => pickImage('camera') },
        { text: 'Photo Library', onPress: () => pickImage('library') },
      ],
    );
  };

  const pickImage = async (mode: 'camera' | 'library') => {
    if (!user || !report) return;
    try {
      let res: ImagePicker.ImagePickerResult;
      if (mode === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission needed', 'Camera access is required to take a photo.');
          return;
        }
        res = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: true,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission needed', 'Photo library access is required to select a photo.');
          return;
        }
        res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsEditing: true,
        });
      }

      if (res.canceled || !res.assets[0]?.uri) return;

      setUploadingPhoto(true);
      const localUri = res.assets[0].uri;

      // Manipulate & compress image to 1024px
      const manipulated = await ImageManipulator.manipulate(localUri)
        .resize({ width: 1024 })
        .renderAsync();
      const saveRes = await manipulated.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });

      // Upload to Cloudinary
      const cloudUrl = await uploadImage(
        saveRes.uri,
        `reports/${report.reportId}_photo_${Date.now()}.jpg`,
      );

      // Update Firestore report document
      const updatedGallery = await addReportPhoto(report.reportId, user.uid, cloudUrl);

      // Focus newly uploaded photo
      setActiveImageIdx(updatedGallery.length - 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload photo';
      Alert.alert('Upload Failed', msg);
    } finally {
      setUploadingPhoto(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    setError(false);
    return subscribeToReport(id, setReport, () => setError(true));
  }, [id, retryKey]);

  useEffect(() => {
    const id = scrollAnim.addListener(({ value }) => {
      scrollViewRef.current?.scrollTo({ y: value, animated: false });
    });
    return () => scrollAnim.removeListener(id);
  }, [scrollAnim]);

  useEffect(() => {
    if (keyboardHeight > 0) {
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          const target = Math.max(
            0,
            contentHeight.current - viewportHeight.current,
          );
          scrollAnim.stopAnimation();
          scrollAnim.setValue(scrollY.current);
          Animated.timing(scrollAnim, {
            toValue: target,
            duration: 450,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
        scrollAnim.stopAnimation();
      };
    }
  }, [keyboardHeight, scrollAnim]);

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

  const isUpvoted = !!user && (report?.upvotedBy?.includes(user.uid) ?? false);

  const handleUpvote = () => {
    if (!user || user.isAnonymous) {
      Alert.alert(
        'Account required',
        'Sign in to upvote reports and earn Civic Points.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign in', onPress: () => router.push('/auth/login') },
        ],
      );
      return;
    }
    if (id) runAction(async () => { await toggleUpvoteReport(id, user.uid); });
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

  const handleDirections = async () => {
    if (!report) return;
    const { latitude, longitude, category, vibe } = report;
    const label = encodeURIComponent(`${cap(category)} ${vibe === 'win' ? 'win' : 'issue'}`);
    const primary = Platform.select({
      ios: `maps://?daddr=${latitude},${longitude}&q=${label}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    })!;
    const webFallback = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    try {
      const supported = await Linking.canOpenURL(primary);
      await Linking.openURL(supported ? primary : webFallback);
    } catch {
      Alert.alert('Could not open maps', 'Please try again.');
    }
  };

  const handleShare = async () => {
    if (!report) return;
    const url = Linking.createURL(`/report/${report.reportId}`);
    const noun = `civic ${report.vibe === 'win' ? 'win' : 'issue'}`;
    const message =
      report.status === 'pending'
        ? `Spotted a ${noun} on ReCiti — can you verify it? It needs ${VERIFICATION_THRESHOLD} neighbours to confirm.\n\n${url}`
        : `Spotted a ${noun} on ReCiti — take a look.\n\n${url}`;
    try {
      await Share.share({ message, url });
    } catch {
      Alert.alert('Share failed', 'Could not open the share sheet. Please try again.');
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
      style={styles.iconBtn}
    >
      <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
    </AnimatedButton>
  );

  const UpvoteButton = report && report.status !== 'pending' && report.status !== 'archived' ? (
    <AnimatedButton
      onPress={handleUpvote}
      disabled={actionLoading}
      hapticFeedback="light"
      style={[
        styles.iconBtn,
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 10,
          borderRadius: 20,
          backgroundColor: isUpvoted ? colors.primary : 'rgba(0,0,0,0.3)',
        },
      ]}
    >
      <Ionicons
        name={isUpvoted ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
        size={20}
        color="#FFFFFF"
      />
      <Typography variant="caption" weight="bold" color="#FFFFFF">
        {report.upvotedBy?.length ?? 0}
      </Typography>
    </AnimatedButton>
  ) : null;

  const ShareButton = report && report.status !== 'archived' ? (
    <AnimatedButton
      onPress={handleShare}
      hapticFeedback="light"
      style={styles.iconBtn}
    >
      <Ionicons name="share-social-outline" size={22} color="#FFFFFF" />
    </AnimatedButton>
  ) : <View style={styles.iconBtn} />;

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
      <RAnimated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={[styles.fill, { backgroundColor: colors.background, paddingTop: insets.top }]}
      >
        <ReportDetailSkeleton />
      </RAnimated.View>
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
                    : `Verify (${report.verifiedBy.length}/${VERIFICATION_THRESHOLD})`
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
        const isReporter = !!uid && report.reporterId === uid;
        if (!isReporter) {
          return (
            <Card padding="lg">
              <Typography variant="subtitle" weight="bold">
                Verified — waiting on a fix
              </Typography>
              <Typography variant="caption" color={colors.textMuted} style={styles.cardSub}>
                Only the original reporter can submit the “after” photo. Spotted
                it fixed? Mention it in the discussion below.
              </Typography>
            </Card>
          );
        }
        return (
          <Card padding="lg">
            <Typography variant="subtitle" weight="bold">
              Has this been fixed?
            </Typography>
            <Typography variant="caption" color={colors.textMuted} style={styles.cardSub}>
              If you’ve seen this issue resolved, submit an “after” photo so the
              neighbours who verified it can confirm the fix.
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
        const isVerifier = !!uid && report.verifiedBy.includes(uid);
        const confirmedBy = report.resolutionConfirmedBy ?? [];
        const alreadyConfirmed = !!uid && confirmedBy.includes(uid);
        return (
          <Card padding="lg">
            <Typography variant="subtitle" weight="bold">
              Is the fix real?
            </Typography>
            <Typography variant="caption" color={colors.textMuted} style={styles.cardSub}>
              {isSubmitter
                ? 'You submitted this fix — waiting for the neighbours who verified the issue to confirm it.'
                : isVerifier
                  ? 'You verified this issue. Confirm the “after” photo shows it genuinely resolved.'
                  : 'Only the neighbours who verified this issue can confirm the fix.'}
            </Typography>
            {isVerifier && !isSubmitter && (
              <PrimaryButton
                icon="checkmark-done"
                label={
                  alreadyConfirmed
                    ? 'You confirmed this fix'
                    : `Confirm the fix (${confirmedBy.length}/${RESOLUTION_CONFIRMATION_THRESHOLD})`
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
      <View
        style={[
          styles.stickyHeader,
          { paddingTop: insets.top + 8 },
          scrolled && {
            backgroundColor: colors.background,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          },
        ]}
      >
        {BackButton}
        <View style={styles.headerRightGroup}>
          {UpvoteButton}
          {ShareButton}
        </View>
      </View>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          keyboardHeight > 0 && { paddingBottom: keyboardHeight + 140 },
        ]}
        overScrollMode='never'
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onLayout={(e) => {
          viewportHeight.current = e.nativeEvent.layout.height;
        }}
        onContentSizeChange={(_w, h) => {
          contentHeight.current = h;
        }}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          scrollY.current = y;
          if (y > 24 !== scrolled) setScrolled(y > 24);
        }}
      >
        {/* Hero */}
        {(() => {
          const gallery = report.imageUrls && report.imageUrls.length > 0
            ? report.imageUrls
            : (report.imageUrl ? [report.imageUrl] : []);
          const safeIdx = Math.min(activeImageIdx, Math.max(0, gallery.length - 1));
          const heroUrl = gallery[safeIdx];
          const isReporter = user?.uid === report.reporterId;
          const canAddPhoto = isReporter && gallery.length < 3 && report.status !== 'archived';
          const showThumbStrip = gallery.length > 1 || canAddPhoto;
          return (
            <>
              <View style={styles.hero}>
                {heroUrl ? (
                  <Image
                    source={{ uri: heroUrl }}
                    style={styles.heroImage}
                    contentFit="cover"
                    transition={300}
                  />
                ) : (
                  <View style={[styles.heroImage, styles.center, { backgroundColor: colors.surface }]}>
                    <Ionicons name="image-outline" size={48} color={colors.border} />
                  </View>
                )}
                <View style={[styles.statusPill, { backgroundColor: status.color, bottom: 16 }]}>
                  <Typography variant="caption" weight="bold" color="#FFFFFF">
                    {status.label}
                  </Typography>
                </View>
              </View>
              {showThumbStrip && (
                <View style={[styles.thumbStrip, { backgroundColor: colors.background }]}>
                  {gallery.map((url, i) => {
                    const active = i === safeIdx;
                    return (
                      <AnimatedButton
                        key={`${url}-${i}`}
                        onPress={() => setActiveImageIdx(i)}
                        hapticFeedback="light"
                        style={[
                          styles.thumbBtn,
                          { borderColor: active ? colors.primary : 'transparent' },
                        ]}
                      >
                        <Image source={{ uri: url }} style={styles.thumbImg} contentFit="cover" />
                      </AnimatedButton>
                    );
                  })}
                  {canAddPhoto && (
                    <AnimatedButton
                      onPress={handleAddPhoto}
                      disabled={uploadingPhoto}
                      hapticFeedback="medium"
                      style={[
                        styles.thumbBtn,
                        styles.addPhotoBtn,
                        {
                          borderColor: colors.primary,
                          backgroundColor: colors.surface,
                        },
                      ]}
                    >
                      {uploadingPhoto ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <View style={styles.addPhotoIconContent}>
                          <Ionicons name="camera-outline" size={24} color={colors.primary} />
                          <Typography
                            variant="caption"
                            weight="bold"
                            color={colors.primary}
                            style={{ fontSize: 12, marginTop: 2 }}
                          >
                            + Photo
                          </Typography>
                        </View>
                      )}
                    </AnimatedButton>
                  )}
                </View>
              )}
            </>
          );
        })()}

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
                Reported by {reporterName ?? 'a neighbour'}
                {report.city ? ` · ${report.city}` : ''} ·{' '}
                {formatDistanceToNow(report.createdAt.toDate(), { addSuffix: true })}
              </Typography>
            </View>
          </View>

          {/* Description */}
          {report.description ? (
            <Typography variant="body" style={styles.description}>
              {report.description}
            </Typography>
          ) : null}

          {/* Contextual actions */}
          <View style={styles.sectionLabel} />
          {renderActions()}

          {/* Directions */}
          <Typography
            variant="caption"
            weight="bold"
            color={colors.textMuted}
            style={styles.sectionLabel}
          >
            LOCATION
          </Typography>
          <Card padding="none">
            <AnimatedButton
              onPress={handleDirections}
              hapticFeedback="light"
              style={styles.directionsRow}
            >
              <View
                style={[styles.directionsIcon, { backgroundColor: colors.primaryMuted }]}
              >
                <Ionicons name="navigate" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Typography variant="body" weight="bold">
                  {report.city ?? 'Get directions'}
                </Typography>
                <Typography variant="caption" color={colors.textMuted}>
                  {report.city
                    ? 'Tap to open this spot in your maps app'
                    : 'Open this spot in your maps app'}
                </Typography>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </AnimatedButton>
          </Card>

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

          {/* Discussion */}
          <CommentThread report={report} />

        </View>
      </ScrollView>
      <CommentComposer report={report} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 140 },
  hero: { position: 'relative' },
  heroImage: { width: '100%', height: 290 },
  thumbStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  thumbBtn: {
    width: 120,
    aspectRatio: 4/3,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
  },
  thumbImg: { width: '100%', height: '100%' },
  addPhotoBtn: {
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoIconContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
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
  description: { marginTop: 16, lineHeight: 22 },
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
  directionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  directionsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
