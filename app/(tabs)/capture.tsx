import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { geohashForLocation } from 'geofire-common';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useUser } from '@/hooks/useAuth';
import { createReport } from '@/lib/db';
import { uploadImage } from '@/lib/storage';
import { useTheme } from '@/theme';

type Vibe = 'win' | 'fail';
type Category = 'waste' | 'traffic' | 'infrastructure';

const GRADIENT = ['#34D399', '#10B981', '#059669'] as const;
const DESCRIPTION_MAX = 280;
const MAX_PHOTOS = 3;

const CATEGORIES: { label: string; value: Category; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Waste', value: 'waste', icon: 'trash-outline' },
  { label: 'Traffic', value: 'traffic', icon: 'car-outline' },
  { label: 'Infrastructure', value: 'infrastructure', icon: 'construct-outline' },
];

const MICRO_EDUCATION: Record<Category, string> = {
  waste:
    'Illegal dumping can attract pests and contaminate groundwater. Reporting it helps keep your city clean.',
  traffic:
    'City councils review traffic reports to improve road safety. Your report could prevent a future accident.',
  infrastructure:
    'Infrastructure damage costs a city more the longer it is left unrepaired. Your report triggers a faster fix.',
};

interface Submitted {
  category: Category;
  vibe: Vibe;
  reportId: string;
}

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const user = useUser();
  const router = useRouter();
  const { colors, spacing, radii, isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  const [imageUris, setImageUris] = useState<string[]>([]);
  const [vibe, setVibe] = useState<Vibe>('fail');
  const [category, setCategory] = useState<Category>('waste');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPhotosSheet, setShowPhotosSheet] = useState(false);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);

  type LocStatus = 'idle' | 'fetching' | 'ready' | 'denied' | 'error';
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [locStatus, setLocStatus] = useState<LocStatus>('idle');

  const detectLocation = useCallback(async (): Promise<
    { latitude: number; longitude: number; city: string | null } | null
  > => {
    setLocStatus('fetching');
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setLocStatus('denied');
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const { latitude, longitude } = pos.coords;
      setCoords({ latitude, longitude });

      let resolvedCity: string | null = null;
      try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        resolvedCity = results[0]?.city ?? results[0]?.subregion ?? null;
      } catch {
        // reverse-geocode failed — keep coords, leave city null
      }
      setCity(resolvedCity);
      setLocStatus('ready');
      return { latitude, longitude, city: resolvedCity };
    } catch {
      setLocStatus('error');
      return null;
    }
  }, []);

  // Detect location when the first photo is added; clear when all are removed.
  const hasAnyPhoto = imageUris.length > 0;
  useEffect(() => {
    if (hasAnyPhoto && locStatus === 'idle') {
      detectLocation();
    } else if (!hasAnyPhoto) {
      setCoords(null);
      setCity(null);
      setLocStatus('idle');
    }
  }, [hasAnyPhoto, locStatus, detectLocation]);

  /**
   * On Android the OS can destroy this Activity while the camera is open. When
   * that happens `launchCameraAsync` resolves as canceled even though a photo
   * was taken — the real result has to be recovered with getPendingResultAsync.
   */
  const recoverPendingPhoto = useCallback(async () => {
    try {
      const pending = await ImagePicker.getPendingResultAsync();
      if (
        pending &&
        !Array.isArray(pending) &&
        'canceled' in pending &&
        !pending.canceled &&
        pending.assets?.[0]?.uri
      ) {
        const uri = pending.assets[0].uri;
        setImageUris((prev) => (prev.length >= MAX_PHOTOS ? prev : [...prev, uri]));
      }
    } catch (e) {
      console.warn('[capture] Failed to recover pending camera photo:', e);
    }
  }, []);

  // Recover a photo if the app was relaunched cold after the camera closed.
  useEffect(() => {
    recoverPendingPhoto();
  }, [recoverPendingPhoto]);

  const appendPhoto = (uri: string) => {
    setImageUris((prev) => (prev.length >= MAX_PHOTOS ? prev : [...prev, uri]));
  };

  const removePhotoAt = (index: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTakePhoto = async () => {
    if (imageUris.length >= MAX_PHOTOS) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please grant camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
    });
    if (!result.canceled) {
      appendPhoto(result.assets[0].uri);
      return;
    }
    // Canceled may mean the Activity was killed mid-capture — try to recover.
    await recoverPendingPhoto();
  };

  const handlePickImage = async () => {
    if (imageUris.length >= MAX_PHOTOS) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please grant photo library access in Settings.');
      return;
    }
    const remaining = MAX_PHOTOS - imageUris.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri).slice(0, remaining);
      setImageUris((prev) => [...prev, ...uris].slice(0, MAX_PHOTOS));
    }
  };

  const promptAddPhoto = () => {
    Alert.alert('Add photo', undefined, [
      { text: 'Camera', onPress: handleTakePhoto },
      { text: 'Gallery', onPress: handlePickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    if (imageUris.length === 0) {
      Alert.alert('Add a photo', 'Capture or pick a photo of what you spotted first.');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be signed in to submit a report.');
      return;
    }
    if (user.isAnonymous) {
      Alert.alert(
        'Account required',
        'Create an account to submit civic reports, earn Civic Points, and track your impact.',
        [
          { text: 'Maybe later', style: 'cancel' },
          { text: 'Create account', onPress: () => router.push('/auth/login') },
        ],
      );
      return;
    }

    setLoading(true);
    try {
      let resolvedCoords = coords;
      let resolvedCity = city;
      if (!resolvedCoords) {
        const detected = await detectLocation();
        if (!detected) {
          Alert.alert('Location required', 'Location permission is needed to tag your report.');
          setLoading(false);
          return;
        }
        resolvedCoords = { latitude: detected.latitude, longitude: detected.longitude };
        resolvedCity = detected.city;
      }
      const { latitude, longitude } = resolvedCoords;
      const geohash = geohashForLocation([latitude, longitude]);

      const storageId = `${user.uid}_${Date.now()}`;
      const uploadedUrls = await Promise.all(
        imageUris.map(async (localUri, i) => {
          const ctx = ImageManipulator.manipulate(localUri);
          ctx.resize({ width: 1024 });
          const ref = await ctx.renderAsync();
          const compressed = await ref.saveAsync({
            format: SaveFormat.JPEG,
            compress: 0.7,
          });
          return uploadImage(compressed.uri, `reports/${storageId}_${i}.jpg`);
        }),
      );

      const trimmedDescription = description.trim();
      const reportId = await createReport({
        reporterId: user.uid,
        imageUrl: uploadedUrls[0],
        imageUrls: uploadedUrls,
        vibe,
        category,
        latitude,
        longitude,
        geohash,
        description: trimmedDescription ? trimmedDescription : null,
        city: resolvedCity,
      });

      setSubmitted({ category, vibe, reportId });
      setImageUris([]);
      setDescription('');
      setShowModal(true);
    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert('Submission failed', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => setShowModal(false);

  const trackReport = () => {
    setShowModal(false);
    if (submitted?.reportId) {
      router.push({ pathname: '/report/[id]', params: { id: submitted.reportId } });
    }
  };

  const submitDisabled = loading || imageUris.length === 0 || locStatus === 'fetching';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Typography variant="h1">New report</Typography>
        <Typography variant="body" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
          Spot a civic win or flag an issue near you.
        </Typography>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Anonymous notice */}
        {user?.isAnonymous && (
          <AnimatedButton
            onPress={() => router.push('/auth/login')}
            hapticFeedback="light"
            style={[styles.banner, { backgroundColor: colors.primaryMuted, borderRadius: radii.md }]}
          >
            <Ionicons name="person-circle" size={20} color={colors.primary} />
            <Typography variant="caption" weight="semiBold" color={colors.primary} style={styles.bannerText}>
              Sign in to submit reports and earn Civic Points
            </Typography>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </AnimatedButton>
        )}

        {/* Photo zone — only the cover photo is shown inline; extras live in the sheet. */}
        {imageUris.length > 0 ? (
          <View style={[styles.photoFilled, { borderRadius: radii.lg, backgroundColor: colors.surface }]}>
            <Image
              source={{ uri: imageUris[0] }}
              style={[styles.photoImage, { borderRadius: radii.lg }]}
              contentFit="cover"
            />
            <AnimatedButton
              onPress={() => removePhotoAt(0)}
              hapticFeedback="medium"
              style={styles.removeBtn}
            >
              <Ionicons name="close-circle" size={30} color={colors.danger} />
            </AnimatedButton>
            <View style={styles.coverBtnRow}>
              <AnimatedButton
                onPress={handlePickImage}
                hapticFeedback="light"
                style={[styles.replaceBtn, { backgroundColor: colors.glassBackground }]}
              >
                <Ionicons name="camera-reverse-outline" size={16} color={colors.text} />
                <Typography variant="caption" weight="semiBold">
                  Change
                </Typography>
              </AnimatedButton>
              {imageUris.length < MAX_PHOTOS && (
                <AnimatedButton
                  onPress={promptAddPhoto}
                  hapticFeedback="light"
                  style={[styles.replaceBtn, { backgroundColor: colors.glassBackground }]}
                >
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Typography variant="caption" weight="semiBold" color={colors.primary}>
                    Add another
                  </Typography>
                </AnimatedButton>
              )}
              {imageUris.length >= 2 && (
                <AnimatedButton
                  onPress={() => setShowPhotosSheet(true)}
                  hapticFeedback="light"
                  style={[styles.replaceBtn, { backgroundColor: colors.glassBackground }]}
                >
                  <Ionicons name="images" size={16} color={colors.text} />
                  <Typography variant="caption" weight="semiBold">
                    {imageUris.length}
                  </Typography>
                </AnimatedButton>
              )}
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.photoZone,
              { borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radii.lg },
            ]}
          >
            <View style={[styles.photoIcon, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="camera" size={32} color={colors.primary} />
            </View>
            <Typography variant="subtitle" weight="bold" style={{ marginTop: spacing.sm }}>
              Add a photo
            </Typography>
            <Typography variant="caption" color={colors.textMuted} align="center">
              Show the civic win or issue you spotted
            </Typography>
            <View style={styles.photoBtnRow}>
              <AnimatedButton
                onPress={handleTakePhoto}
                hapticFeedback="medium"
                style={[styles.photoBtn, { backgroundColor: colors.primary, borderRadius: radii.md }]}
              >
                <Ionicons name="camera" size={18} color={colors.white} />
                <Typography variant="caption" weight="bold" color={colors.white}>
                  Camera
                </Typography>
              </AnimatedButton>
              <AnimatedButton
                onPress={handlePickImage}
                hapticFeedback="light"
                style={[
                  styles.photoBtn,
                  { borderColor: colors.border, borderWidth: 1.5, borderRadius: radii.md },
                ]}
              >
                <Ionicons name="images-outline" size={18} color={colors.primary} />
                <Typography variant="caption" weight="bold" color={colors.primary}>
                  Gallery
                </Typography>
              </AnimatedButton>
            </View>
          </View>
        )}

        {/* Location chip — appears once a photo is selected */}
        {hasAnyPhoto && (
          <AnimatedButton
            onPress={detectLocation}
            hapticFeedback="light"
            disabled={locStatus === 'fetching'}
            style={[
              styles.locationChip,
              {
                backgroundColor: colors.surface,
                borderColor:
                  locStatus === 'denied' || locStatus === 'error'
                    ? colors.danger
                    : colors.border,
                borderRadius: radii.md,
              },
            ]}
          >
            <Ionicons
              name={
                locStatus === 'denied' || locStatus === 'error'
                  ? 'alert-circle'
                  : 'location'
              }
              size={16}
              color={
                locStatus === 'denied' || locStatus === 'error'
                  ? colors.danger
                  : colors.primary
              }
            />
            {locStatus === 'fetching' ? (
              <>
                <ActivityIndicator size="small" color={colors.primary} />
                <Typography variant="caption" weight="semiBold" color={colors.textMuted}>
                  Detecting your city…
                </Typography>
              </>
            ) : (
              <Typography
                variant="caption"
                weight="semiBold"
                color={
                  locStatus === 'denied' || locStatus === 'error'
                    ? colors.danger
                    : colors.text
                }
                style={{ flex: 1 }}
              >
                {locStatus === 'ready'
                  ? city ?? 'Location pinned (city unknown)'
                  : locStatus === 'denied'
                    ? 'Location permission needed — tap to retry'
                    : locStatus === 'error'
                      ? "Couldn't get your location — tap to retry"
                      : 'Tap to add location'}
              </Typography>
            )}
          </AnimatedButton>
        )}

        {/* Vibe */}
        <Typography
          variant="caption"
          weight="bold"
          color={colors.textMuted}
          style={styles.sectionLabel}
        >
          WHAT DID YOU SPOT?
        </Typography>
        <View style={styles.vibeRow}>
          <AnimatedButton
            onPress={() => setVibe('win')}
            hapticFeedback="light"
            style={[
              styles.vibePill,
              { borderRadius: radii.lg, borderColor: vibe === 'win' ? colors.primary : colors.border },
              vibe === 'win' && { backgroundColor: colors.primaryMuted },
            ]}
          >
            <Ionicons
              name="leaf"
              size={24}
              color={vibe === 'win' ? colors.primary : colors.textMuted}
            />
            <Typography
              variant="body"
              weight="bold"
              color={vibe === 'win' ? colors.primary : colors.textMuted}
            >
              Civic Win
            </Typography>
          </AnimatedButton>
          <AnimatedButton
            onPress={() => setVibe('fail')}
            hapticFeedback="light"
            style={[
              styles.vibePill,
              { borderRadius: radii.lg, borderColor: vibe === 'fail' ? colors.danger : colors.border },
              vibe === 'fail' && { backgroundColor: colors.dangerMuted },
            ]}
          >
            <Ionicons
              name="warning"
              size={24}
              color={vibe === 'fail' ? colors.danger : colors.textMuted}
            />
            <Typography
              variant="body"
              weight="bold"
              color={vibe === 'fail' ? colors.danger : colors.textMuted}
            >
              Civic Issue
            </Typography>
          </AnimatedButton>
        </View>

        {/* Category */}
        <Typography
          variant="caption"
          weight="bold"
          color={colors.textMuted}
          style={styles.sectionLabel}
        >
          CATEGORY
        </Typography>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => {
            const active = category === cat.value;
            return (
              <AnimatedButton
                key={cat.value}
                onPress={() => setCategory(cat.value)}
                hapticFeedback="light"
                style={[
                  styles.categoryBtn,
                  {
                    borderRadius: radii.md,
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primaryMuted : colors.transparent,
                  },
                ]}
              >
                <Ionicons
                  name={cat.icon}
                  size={22}
                  color={active ? colors.primary : colors.textMuted}
                />
                <Typography
                  variant="caption"
                  weight="semiBold"
                  color={active ? colors.primary : colors.textMuted}
                >
                  {cat.label}
                </Typography>
              </AnimatedButton>
            );
          })}
        </View>

        {/* Description */}
        <View style={styles.descriptionLabelRow}>
          <Typography
            variant="caption"
            weight="bold"
            color={colors.textMuted}
            style={styles.descriptionLabel}
          >
            DESCRIPTION{' '}
            <Typography variant="caption" color={colors.textMuted}>
              (optional)
            </Typography>
          </Typography>
          <Typography variant="caption" color={colors.textMuted}>
            {description.length}/{DESCRIPTION_MAX}
          </Typography>
        </View>

        <TextInput
          value={description}
          onChangeText={(t) => setDescription(t.slice(0, DESCRIPTION_MAX))}
          onFocus={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300)}
          placeholder="Add context the photo can't show — e.g. 'blocked drain floods when it rains'"
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          maxLength={DESCRIPTION_MAX}
          style={[
            styles.descriptionInput,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              color: colors.text,
            },
          ]}
        />
      </ScrollView>

      {/* Submit */}
      <View style={[styles.submitWrapper, { paddingBottom: insets.bottom }]}>
        <LinearGradient
          colors={isDark
            ? ['transparent', 'rgba(18, 18, 18, 0.8)', 'rgba(18, 18, 18, 1)']
            : ['transparent', 'rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 1)']
          }
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <AnimatedButton
          onPress={handleSubmit}
          disabled={submitDisabled}
          hapticFeedback={submitDisabled ? 'none' : 'success'}
        >
          <LinearGradient
            colors={submitDisabled ? [colors.border, colors.border] : ['#34D399', '#059669']}
            style={styles.submitBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Typography variant="body" weight="bold" color={colors.white}>
                  Submit Report
                </Typography>
                <Ionicons name="send-sharp" size={24} color={colors.white} />
              </>
            )}
          </LinearGradient>
        </AnimatedButton>
      </View>

      {/* Success modal */}
      <Modal transparent visible={showModal} animationType="fade">
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <Card style={styles.modalCard} padding="lg">
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalOrb}
            >
              <Ionicons name="checkmark" size={40} color={colors.white} />
            </LinearGradient>

            <Typography variant="h2" weight="bold" style={{ marginTop: spacing.md }} align="center">
              Report submitted!
            </Typography>
            <Typography
              variant="body"
              color={colors.textMuted}
              align="center"
              style={{ marginTop: spacing.xs }}
            >
              {submitted?.vibe === 'win'
                ? `Your ${submitted?.category} win is live — neighbours will verify it. Thanks for celebrating the good stuff.`
                : `Your ${submitted?.category} issue is live. Neighbours will verify it, and you can follow it all the way to resolved.`}
            </Typography>

            {submitted && (
              <View style={[styles.factCard, { backgroundColor: colors.background, borderRadius: radii.md }]}>
                <Typography variant="caption" weight="bold" color={colors.primary}>
                  📖 CIVIC FACT
                </Typography>
                <Typography
                  variant="caption"
                  color={colors.textMuted}
                  style={{ marginTop: 4, lineHeight: 19 }}
                >
                  {MICRO_EDUCATION[submitted.category]}
                </Typography>
              </View>
            )}

            <View style={[styles.pointsBadge, { backgroundColor: colors.primaryMuted, borderRadius: radii.full }]}>
              <Ionicons name="add-circle" size={16} color={colors.primary} />
              <Typography variant="caption" weight="bold" color={colors.primary}>
                10 Civic Points awarded
              </Typography>
            </View>

            <AnimatedButton
              onPress={trackReport}
              hapticFeedback="medium"
              style={[styles.modalPrimary, { backgroundColor: colors.primary, borderRadius: radii.md }]}
            >
              <Ionicons name="navigate-outline" size={18} color={colors.white} />
              <Typography variant="body" weight="bold" color={colors.white} align="center">
                Track this report
              </Typography>
            </AnimatedButton>
            <AnimatedButton onPress={closeModal} hapticFeedback="light" style={styles.modalDone}>
              <Typography variant="body" weight="semiBold" color={colors.textMuted} align="center">
                Done
              </Typography>
            </AnimatedButton>
          </Card>
        </BlurView>
      </Modal>

      {/* Photos sheet — manage all attached photos. */}
      <Modal
        transparent
        visible={showPhotosSheet}
        animationType="fade"
        onRequestClose={() => setShowPhotosSheet(false)}
      >
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <Card style={styles.modalCard} padding="lg">
            <View style={styles.sheetHeader}>
              <Typography variant="h2" weight="bold">
                Photos
              </Typography>
              <Typography variant="body" color={colors.textMuted}>
                {imageUris.length}/{MAX_PHOTOS}
              </Typography>
            </View>

            <View style={styles.sheetList}>
              {imageUris.map((uri, i) => (
                <View
                  key={`${uri}-${i}`}
                  style={[styles.sheetRow, { backgroundColor: colors.background, borderRadius: radii.md }]}
                >
                  <Image source={{ uri }} style={styles.sheetThumb} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Typography variant="body" weight="semiBold">
                      Photo {i + 1}
                    </Typography>
                    {i === 0 && (
                      <Typography variant="caption" color={colors.primary} weight="semiBold">
                        Cover
                      </Typography>
                    )}
                  </View>
                  <AnimatedButton
                    onPress={() => {
                      const nextCount = imageUris.length - 1;
                      removePhotoAt(i);
                      if (nextCount < 2) setShowPhotosSheet(false);
                    }}
                    hapticFeedback="medium"
                    style={[styles.sheetRemove, { backgroundColor: colors.dangerMuted, borderRadius: radii.full }]}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </AnimatedButton>
                </View>
              ))}
            </View>

            <AnimatedButton
              onPress={() => setShowPhotosSheet(false)}
              hapticFeedback="light"
              style={styles.modalDone}
            >
              <Typography variant="body" weight="semiBold" color={colors.textMuted} align="center">
                Done
              </Typography>
            </AnimatedButton>
          </Card>
        </BlurView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 115 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginTop: 16,
  },
  bannerText: { flex: 1 },
  // Photo hero
  photoZone: {
    marginTop: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 28,
    alignItems: 'center',
  },
  photoIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBtnRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 22,
  },
  photoFilled: { marginTop: 20 },
  photoImage: { width: '100%', height: 250 },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  coverBtnRow: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 6,
  },
  replaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 9999,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
  },
  // Sections
  sectionLabel: { letterSpacing: 1, marginTop: 24, marginBottom: 10 },
  vibeRow: { flexDirection: 'row', gap: 12 },
  vibePill: {
    flex: 1,
    borderWidth: 2,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
  },
  categoryRow: { flexDirection: 'row', gap: 8 },
  categoryBtn: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  descriptionLabelRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 10,
  },
  descriptionLabel: { letterSpacing: 1 },
  descriptionInput: {
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 96,
    fontSize: 15,
    lineHeight: 21,
  },
  // Submit
  submitWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
  },
  submitBtn: {
    borderRadius: 50,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.1)',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOrb: {
    display: 'flex',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  factCard: { width: '100%', padding: 14, marginTop: 20 },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 16,
  },
  modalPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    marginTop: 20,
  },
  modalDone: { paddingVertical: 12, marginTop: 4 },
  sheetHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetList: { width: '100%', gap: 8 },
  sheetRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
  },
  sheetThumb: { width: 56, height: 56, borderRadius: 8 },
  sheetRemove: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
