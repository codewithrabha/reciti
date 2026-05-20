import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { geohashForLocation } from 'geofire-common';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { useUser } from '@/hooks/useAuth';
import { createReport } from '@/lib/db';
import { uploadImage } from '@/lib/storage';
import { Typography } from '@/components/ui/Typography';
import { Card } from '@/components/ui/Card';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useTheme } from '@/theme';

type Vibe = 'win' | 'fail';
type Category = 'waste' | 'traffic' | 'infrastructure';

const GRADIENT = ['#34D399', '#10B981', '#059669'] as const;
const DESCRIPTION_MAX = 280;

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

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [vibe, setVibe] = useState<Vibe>('fail');
  const [category, setCategory] = useState<Category>('waste');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);

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
        setImageUri(pending.assets[0].uri);
      }
    } catch (e) {
      console.warn('[capture] Failed to recover pending camera photo:', e);
    }
  }, []);

  // Recover a photo if the app was relaunched cold after the camera closed.
  useEffect(() => {
    recoverPendingPhoto();
  }, [recoverPendingPhoto]);

  const handleTakePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please grant camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      return;
    }
    // Canceled may mean the Activity was killed mid-capture — try to recover.
    await recoverPendingPhoto();
  };

  const handlePickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please grant photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!imageUri) {
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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location required', 'Location permission is needed to tag your report.');
        setLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;
      const geohash = geohashForLocation([latitude, longitude]);

      const context = ImageManipulator.manipulate(imageUri);
      context.resize({ width: 1024 });
      const imageRef = await context.renderAsync();
      const compressed = await imageRef.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.7,
      });

      const storageId = `${user.uid}_${Date.now()}`;
      const imageUrl = await uploadImage(compressed.uri, `reports/${storageId}.jpg`);

      const trimmedDescription = description.trim();
      const reportId = await createReport({
        reporterId: user.uid,
        imageUrl,
        vibe,
        category,
        latitude,
        longitude,
        geohash,
        description: trimmedDescription ? trimmedDescription : null,
      });

      setSubmitted({ category, vibe, reportId });
      setImageUri(null);
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

  const submitDisabled = loading || !imageUri;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Typography variant="h1">New report</Typography>
        <Typography variant="body" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
          Spot a civic win or flag an issue near you.
        </Typography>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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

        {/* Photo hero */}
        {imageUri ? (
          <View
            style={[
              styles.photoFilled,
              { borderRadius: radii.lg, backgroundColor: colors.surface },
            ]}
          >
            <Image
              source={{ uri: imageUri }}
              style={[styles.photoImage, { borderRadius: radii.lg }]}
              contentFit="cover"
            />
            <AnimatedButton
              onPress={() => setImageUri(null)}
              hapticFeedback="medium"
              style={styles.removeBtn}
            >
              <Ionicons name="close-circle" size={30} color={colors.danger} />
            </AnimatedButton>
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
    </View>
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
  replaceBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 9999,
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
});
