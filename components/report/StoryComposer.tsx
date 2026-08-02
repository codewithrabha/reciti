import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { addStorySlide, STORY_SLIDE_TEXT_MAX } from '@/lib/db';
import { uploadImage } from '@/lib/storage';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useTheme } from '@/theme';

interface StoryComposerProps {
  reportId: string;
  ownerUid: string;
  onClose: () => void;
  /** Called after a slide is successfully posted. */
  onPosted?: () => void;
}

export function StoryComposer({
  reportId,
  ownerUid,
  onClose,
  onPosted,
}: StoryComposerProps) {
  const { colors, radii, spacing } = useTheme();
  const [text, setText] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);

  const charsLeft = STORY_SLIDE_TEXT_MAX - text.length;
  const canPost = text.trim().length > 0 && !posting;

  const pickPhoto = async (fromCamera: boolean) => {
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
            quality: 0.9,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.9,
          });

      if (result.canceled || !result.assets[0]?.uri) return;
      setPhotoUri(result.assets[0].uri);
    } catch {
      Alert.alert('Error', 'Could not access photos. Please try again.');
    }
  };

  const handlePickPhoto = () => {
    Alert.alert('Add Photo', 'Choose a source for your update photo.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Camera', onPress: () => pickPhoto(true) },
      { text: 'Photo Library', onPress: () => pickPhoto(false) },
    ]);
  };

  const handlePost = async () => {
    if (!canPost) return;
    setPosting(true);
    try {
      let cloudUrl: string | null = null;

      if (photoUri) {
        setUploading(true);
        const ctx = ImageManipulator.manipulate(photoUri);
        ctx.resize({ width: 1024 });
        const rendered = await ctx.renderAsync();
        const compressed = await rendered.saveAsync({
          format: SaveFormat.JPEG,
          compress: 0.78,
        });
        cloudUrl = await uploadImage(
          compressed.uri,
          `reports/${reportId}_story_${Date.now()}.jpg`,
        );
        setUploading(false);
      }

      await addStorySlide(reportId, ownerUid, text.trim(), cloudUrl);
      onPosted?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to post update.';
      Alert.alert('Post failed', msg);
    } finally {
      setPosting(false);
      setUploading(false);
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop tap to dismiss */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Handle + title row */}
          <View style={styles.titleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.titleInner}>
              <Ionicons name="megaphone" size={18} color={colors.primary} />
              <Typography variant="subtitle" weight="bold" style={{ marginLeft: 8 }}>
                Post an update
              </Typography>
            </View>
            <AnimatedButton onPress={onClose} hapticFeedback="light" style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </AnimatedButton>
          </View>

          {/* Photo preview (if picked) */}
          {photoUri ? (
            <View style={styles.photoPreviewWrap}>
              <Image
                source={{ uri: photoUri }}
                style={[styles.photoPreview, { borderRadius: radii.md }]}
                contentFit="cover"
              />
              <AnimatedButton
                onPress={() => setPhotoUri(null)}
                hapticFeedback="light"
                style={[styles.removePhotoBtn, { backgroundColor: colors.danger }]}
              >
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </AnimatedButton>
            </View>
          ) : null}

          {/* Text area */}
          <TextInput
            style={[
              styles.textInput,
              {
                color: colors.text,
                borderColor: colors.border,
                borderRadius: radii.md,
                backgroundColor: colors.background,
              },
            ]}
            placeholder="What's the latest on this report?"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={STORY_SLIDE_TEXT_MAX}
            value={text}
            onChangeText={setText}
            autoFocus
          />

          {/* Footer: char count + photo + post */}
          <View style={styles.footer}>
            <Typography
              variant="caption"
              color={charsLeft < 40 ? colors.danger : colors.textMuted}
            >
              {charsLeft}
            </Typography>

            <View style={styles.footerActions}>
              {/* Add photo */}
              <AnimatedButton
                onPress={handlePickPhoto}
                disabled={posting}
                hapticFeedback="light"
                style={[
                  styles.photoBtn,
                  {
                    backgroundColor: photoUri ? colors.primaryMuted : colors.background,
                    borderColor: colors.border,
                    borderRadius: radii.sm,
                  },
                ]}
              >
                <Ionicons
                  name={photoUri ? 'image' : 'image-outline'}
                  size={20}
                  color={photoUri ? colors.primary : colors.textMuted}
                />
              </AnimatedButton>

              {/* Post button */}
              <AnimatedButton
                onPress={handlePost}
                disabled={!canPost}
                hapticFeedback="success"
                style={[
                  styles.postBtn,
                  {
                    backgroundColor: canPost ? colors.primary : colors.border,
                    borderRadius: radii.md,
                  },
                ]}
              >
                {posting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="send"
                      size={16}
                      color={canPost ? '#FFFFFF' : colors.textMuted}
                    />
                    <Typography
                      variant="body"
                      weight="bold"
                      color={canPost ? '#FFFFFF' : colors.textMuted}
                    >
                      {uploading ? 'Uploading…' : 'Post'}
                    </Typography>
                  </>
                )}
              </AnimatedButton>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 6,
  },
  titleRow: {
    alignItems: 'center',
    gap: 4,
  },
  titleInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 4,
  },
  photoPreviewWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  photoPreview: {
    width: 80,
    height: 60,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    minHeight: 100,
    maxHeight: 180,
    padding: 12,
    fontSize: 15,
    lineHeight: 22,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  photoBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 90,
  },
});
