import React, { useState } from 'react';
import { View, ScrollView, Alert, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { geohashForLocation } from 'geofire-common';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

import { useAuth } from '@/hooks/useAuth';
import { createReport } from '@/lib/db';
import { uploadImage } from '@/lib/storage';
import { Typography } from '@/components/ui/Typography';
import { Card } from '@/components/ui/Card';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useTheme } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';

type Vibe = 'win' | 'fail';
type Category = 'waste' | 'traffic' | 'infrastructure';

const CATEGORIES: { label: string; value: Category; icon: string }[] = [
  { label: 'Waste', value: 'waste', icon: 'trash-outline' },
  { label: 'Traffic', value: 'traffic', icon: 'car-outline' },
  { label: 'Infrastructure', value: 'infrastructure', icon: 'construct-outline' },
];

const MICRO_EDUCATION: Record<Category, string> = {
  waste: '🗑️ Did you know? Illegal dumping can attract pests and contaminate groundwater. Reporting it helps keep your city clean!',
  traffic: '🚦 City councils review traffic reports to improve road safety. Your report could prevent a future accident!',
  infrastructure: '🔧 Infrastructure damage costs a city more the longer its left unrepaired. Your report triggers a faster fix!',
};

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [vibe, setVibe] = useState<Vibe>('fail');
  const [category, setCategory] = useState<Category>('waste');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [completedCategory, setCompletedCategory] = useState<Category>('waste');

  const handlePickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please grant photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please grant camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!imageUri) {
      Alert.alert('Missing Image', 'Please capture or select an image first.');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be logged in to submit a report.');
      return;
    }

    if (user.isAnonymous) {
      Alert.alert(
        '🔐 Account Required',
        'You need to create an account to submit civic reports. Sign up to earn Civic Points and track your impact!',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Create Account', onPress: () => router.push('/auth/login') },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Required', 'Location permission is needed to tag your report.');
        setLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = location.coords;
      const geohash = geohashForLocation([latitude, longitude]);

      const context = ImageManipulator.manipulate(imageUri);
      context.resize({ width: 1024 });
      const imageRef = await context.renderAsync();
      const compressed = await imageRef.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });

      const reportId = `${user.uid}_${Date.now()}`;
      const imageUrl = await uploadImage(compressed.uri, reportId);

      await createReport({
        reporterId: user.uid,
        imageUrl,
        vibe,
        category,
        latitude,
        longitude,
        geohash,
      });

      setCompletedCategory(category);
      setImageUri(null);
      setShowModal(true);
    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert('Submission Failed', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
          <Typography variant="h1">New Report</Typography>
          <Typography variant="body" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
            Document a civic issue or win
          </Typography>
        </View>

        {/* Image Picker */}
        <Card style={styles.card}>
          <Typography variant="caption" weight="bold" color={colors.textMuted} style={{ letterSpacing: 1, marginBottom: spacing.md }}>
            PHOTO
          </Typography>
          {imageUri ? (
            <AnimatedButton onPress={handlePickImage} hapticFeedback="light">
              <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" />
              <AnimatedButton
                onPress={() => setImageUri(null)}
                style={styles.clearBtn}
                hapticFeedback="medium"
              >
                <Ionicons name="close-circle" size={32} color={colors.danger} />
              </AnimatedButton>
            </AnimatedButton>
          ) : (
            <View style={styles.imagePickerRow}>
              <AnimatedButton
                style={[styles.imageBtn, { borderColor: colors.border }]}
                onPress={handleTakePhoto}
                hapticFeedback="medium"
              >
                <Ionicons name="camera-outline" size={28} color={colors.primary} />
                <Typography variant="body" weight="semiBold">Camera</Typography>
              </AnimatedButton>
              <AnimatedButton
                style={[styles.imageBtn, { borderColor: colors.border }]}
                onPress={handlePickImage}
                hapticFeedback="light"
              >
                <Ionicons name="image-outline" size={28} color={colors.primary} />
                <Typography variant="body" weight="semiBold">Gallery</Typography>
              </AnimatedButton>
            </View>
          )}
        </Card>

        {/* Vibe Toggle */}
        <Card style={styles.card}>
          <Typography variant="caption" weight="bold" color={colors.textMuted} style={{ letterSpacing: 1, marginBottom: spacing.md }}>
            VIBE
          </Typography>
          <View style={styles.vibeRow}>
            <AnimatedButton
              onPress={() => setVibe('win')}
              hapticFeedback="light"
              style={[
                styles.vibeBtn,
                { borderColor: vibe === 'win' ? colors.primary : colors.border },
                vibe === 'win' && { backgroundColor: colors.primaryMuted },
              ]}
            >
              <Typography variant="h2">🟢</Typography>
              <Typography variant="body" weight="bold" color={vibe === 'win' ? colors.primary : colors.textMuted}>
                Civic Win
              </Typography>
            </AnimatedButton>
            <AnimatedButton
              onPress={() => setVibe('fail')}
              hapticFeedback="light"
              style={[
                styles.vibeBtn,
                { borderColor: vibe === 'fail' ? colors.danger : colors.border },
                vibe === 'fail' && { backgroundColor: colors.dangerMuted },
              ]}
            >
              <Typography variant="h2">🔴</Typography>
              <Typography variant="body" weight="bold" color={vibe === 'fail' ? colors.danger : colors.textMuted}>
                Civic Fail
              </Typography>
            </AnimatedButton>
          </View>
        </Card>

        {/* Category */}
        <Card style={styles.card}>
          <Typography variant="caption" weight="bold" color={colors.textMuted} style={{ letterSpacing: 1, marginBottom: spacing.md }}>
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
                    { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primaryMuted : 'transparent' },
                  ]}
                >
                  <Ionicons name={cat.icon as any} size={24} color={active ? colors.primary : colors.textMuted} />
                  <Typography variant="caption" weight="semiBold" color={active ? colors.primary : colors.textMuted}>
                    {cat.label}
                  </Typography>
                </AnimatedButton>
              );
            })}
          </View>
        </Card>
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.submitWrapper, { backgroundColor: colors.background }]}>
        <AnimatedButton
          onPress={handleSubmit}
          disabled={loading || !imageUri}
          hapticFeedback={(!imageUri || loading) ? 'none' : 'success'}
        >
          <LinearGradient
            colors={(!imageUri || loading) ? [colors.border, colors.border] : ['#34D399', '#059669']}
            style={styles.submitBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={24} color={colors.white} />
                <Typography variant="body" weight="bold" color={colors.white} style={{ marginLeft: spacing.sm }}>
                  Submit Report
                </Typography>
              </>
            )}
          </LinearGradient>
        </AnimatedButton>
      </View>

      {/* Micro-Education Modal */}
      <Modal transparent visible={showModal} animationType="fade">
        <BlurView intensity={20} style={styles.modalOverlay} tint="dark">
          <Card style={styles.modalCard} padding="lg">
            <Typography variant="h1" style={{ marginBottom: spacing.sm }}>🎉</Typography>
            <Typography variant="h2" weight="bold" style={{ marginBottom: spacing.lg }}>Report Submitted!</Typography>
            
            <Typography variant="body" weight="bold" color={colors.primary} style={{ marginBottom: spacing.sm }}>
              📖 Civic Fact
            </Typography>
            <Typography variant="body" color={colors.textMuted} align="center" style={{ marginBottom: spacing.lg, lineHeight: 24 }}>
              {MICRO_EDUCATION[completedCategory]}
            </Typography>
            
            <View style={[styles.pointsBadge, { backgroundColor: colors.primaryMuted }]}>
              <Typography variant="body" weight="bold" color={colors.primary}>
                +10 Civic Points Awarded!
              </Typography>
            </View>
            
            <AnimatedButton style={{ width: '100%' }} onPress={() => setShowModal(false)} hapticFeedback="light">
              <LinearGradient
                colors={['#34D399', '#059669']}
                style={styles.modalCloseBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Typography variant="body" weight="bold" color={colors.white}>Awesome!</Typography>
              </LinearGradient>
            </AnimatedButton>
          </Card>
        </BlurView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingVertical: 16 },
  card: { marginHorizontal: 16, marginBottom: 16 },
  previewImage: { width: '100%', height: 220, borderRadius: 12 },
  clearBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'white', borderRadius: 16 },
  imagePickerRow: { flexDirection: 'row', gap: 12 },
  imageBtn: {
    flex: 1, borderWidth: 1.5, borderRadius: 12, borderStyle: 'dashed',
    paddingVertical: 32, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  vibeRow: { flexDirection: 'row', gap: 12 },
  vibeBtn: {
    flex: 1, borderWidth: 2, borderRadius: 12, paddingVertical: 20,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  categoryRow: { flexDirection: 'row', gap: 8 },
  categoryBtn: {
    flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  submitWrapper: { position: 'absolute', bottom: 90, left: 0, right: 0, padding: 16 },
  submitBtn: {
    borderRadius: 16, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: { width: '100%', alignItems: 'center' },
  pointsBadge: {
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 24,
  },
  modalCloseBtn: {
    borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center',
  },
});
