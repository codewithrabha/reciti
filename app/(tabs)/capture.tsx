import React, { useState, useRef } from 'react';
import {
  View, Text, Pressable, ScrollView, Alert,
  ActivityIndicator, StyleSheet, useColorScheme, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { geohashForLocation } from 'geofire-common';

import { useAuth } from '@/hooks/useAuth';
import { createReport } from '@/lib/db';
import { uploadImage } from '@/lib/storage';
import { Report } from '@/types';

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
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [vibe, setVibe] = useState<Vibe>('fail');
  const [category, setCategory] = useState<Category>('waste');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [completedCategory, setCompletedCategory] = useState<Category>('waste');

  const bg = dark ? '#0f172a' : '#f8fafc';
  const cardBg = dark ? '#1e293b' : '#ffffff';
  const textPrimary = dark ? '#f1f5f9' : '#0f172a';
  const textMuted = dark ? '#94a3b8' : '#64748b';
  const border = dark ? '#334155' : '#e2e8f0';

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

    setLoading(true);
    try {
      // 1. Get location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Required', 'Location permission is needed to tag your report.');
        setLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = location.coords;
      const geohash = geohashForLocation([latitude, longitude]);

      // 2. Compress image using the new contextual API (expo-image-manipulator v14)
      const context = ImageManipulator.manipulate(imageUri);
      context.resize({ width: 1024 });
      const imageRef = await context.renderAsync();
      const compressed = await imageRef.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });

      // 3. Create a placeholder report doc to get an ID
      const reportId = `${user.uid}_${Date.now()}`;

      // 4. Upload compressed image to Firebase Storage
      const imageUrl = await uploadImage(compressed.uri, reportId);

      // 5. Save report to Firestore
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
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: textPrimary }]}>New Report</Text>
          <Text style={[styles.subtitle, { color: textMuted }]}>Document a civic issue or win</Text>
        </View>

        {/* Image Picker */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionLabel, { color: textMuted }]}>PHOTO</Text>
          {imageUri ? (
            <Pressable onPress={handlePickImage}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" />
              <Pressable onPress={() => setImageUri(null)} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={28} color="#f43f5e" />
              </Pressable>
            </Pressable>
          ) : (
            <View style={styles.imagePickerRow}>
              <Pressable
                style={[styles.imageBtn, { borderColor: border }]}
                onPress={handleTakePhoto}
              >
                <Ionicons name="camera-outline" size={28} color="#10b981" />
                <Text style={[styles.imageBtnText, { color: textPrimary }]}>Camera</Text>
              </Pressable>
              <Pressable
                style={[styles.imageBtn, { borderColor: border }]}
                onPress={handlePickImage}
              >
                <Ionicons name="image-outline" size={28} color="#10b981" />
                <Text style={[styles.imageBtnText, { color: textPrimary }]}>Gallery</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Vibe Toggle */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionLabel, { color: textMuted }]}>VIBE</Text>
          <View style={styles.vibeRow}>
            <Pressable
              onPress={() => setVibe('win')}
              style={[
                styles.vibeBtn,
                { borderColor: vibe === 'win' ? '#10b981' : border },
                vibe === 'win' && styles.vibeBtnActiveWin,
              ]}
            >
              <Text style={styles.vibeEmoji}>🟢</Text>
              <Text style={[styles.vibeBtnText, { color: vibe === 'win' ? '#10b981' : textMuted }]}>
                Civic Win
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVibe('fail')}
              style={[
                styles.vibeBtn,
                { borderColor: vibe === 'fail' ? '#f43f5e' : border },
                vibe === 'fail' && styles.vibeBtnActiveFail,
              ]}
            >
              <Text style={styles.vibeEmoji}>🔴</Text>
              <Text style={[styles.vibeBtnText, { color: vibe === 'fail' ? '#f43f5e' : textMuted }]}>
                Civic Fail
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Category */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionLabel, { color: textMuted }]}>CATEGORY</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const active = category === cat.value;
              return (
                <Pressable
                  key={cat.value}
                  onPress={() => setCategory(cat.value)}
                  style={[
                    styles.categoryBtn,
                    { borderColor: active ? '#10b981' : border, backgroundColor: active ? '#ecfdf5' : 'transparent' },
                  ]}
                >
                  <Ionicons name={cat.icon as any} size={22} color={active ? '#10b981' : textMuted} />
                  <Text style={[styles.categoryLabel, { color: active ? '#10b981' : textMuted }]}>
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.submitWrapper, { backgroundColor: bg }]}>
        <Pressable
          onPress={handleSubmit}
          disabled={loading || !imageUri}
          style={[styles.submitBtn, (!imageUri || loading) && styles.submitBtnDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color="white" />
              <Text style={styles.submitBtnText}>Submit Report</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Micro-Education Modal */}
      <Modal transparent visible={showModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <Text style={styles.modalEmoji}>🎉</Text>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>Report Submitted!</Text>
            <Text style={[styles.modalEduTitle, { color: '#10b981' }]}>📖 Civic Fact</Text>
            <Text style={[styles.modalEduText, { color: textMuted }]}>
              {MICRO_EDUCATION[completedCategory]}
            </Text>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsText}>+10 Civic Points Awarded!</Text>
            </View>
            <Pressable style={styles.modalCloseBtn} onPress={() => setShowModal(false)}>
              <Text style={styles.modalCloseBtnText}>Awesome!</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 16 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 4 },
  card: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 16,
    padding: 16, borderWidth: 1,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  previewImage: { width: '100%', height: 220, borderRadius: 12 },
  clearBtn: { position: 'absolute', top: 8, right: 8 },
  imagePickerRow: { flexDirection: 'row', gap: 12 },
  imageBtn: {
    flex: 1, borderWidth: 1.5, borderRadius: 12, borderStyle: 'dashed',
    paddingVertical: 24, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  imageBtnText: { fontWeight: '600', fontSize: 14 },
  vibeRow: { flexDirection: 'row', gap: 12 },
  vibeBtn: {
    flex: 1, borderWidth: 2, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  vibeBtnActiveWin: { backgroundColor: '#ecfdf5' },
  vibeBtnActiveFail: { backgroundColor: '#fff1f2' },
  vibeEmoji: { fontSize: 24 },
  vibeBtnText: { fontWeight: '700', fontSize: 14 },
  categoryRow: { flexDirection: 'row', gap: 8 },
  categoryBtn: {
    flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  categoryLabel: { fontSize: 12, fontWeight: '600' },
  submitWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
  submitBtn: {
    backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  submitBtnDisabled: { backgroundColor: '#94a3b8' },
  submitBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    borderRadius: 24, padding: 24, width: '100%', alignItems: 'center',
  },
  modalEmoji: { fontSize: 48, marginBottom: 8 },
  modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 20 },
  modalEduTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  modalEduText: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 20 },
  pointsBadge: {
    backgroundColor: '#ecfdf5', borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 8, marginBottom: 20,
  },
  pointsText: { color: '#10b981', fontWeight: '700', fontSize: 14 },
  modalCloseBtn: {
    backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 14,
    paddingHorizontal: 48,
  },
  modalCloseBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
