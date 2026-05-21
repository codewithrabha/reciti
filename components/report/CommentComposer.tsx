import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Report } from '@/types';
import { COMMENT_MAX_LENGTH, submitComment } from '@/lib/db';
import { useUser, useUserDoc } from '@/hooks/useAuth';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

interface Props {
  report: Report;
}

export function CommentComposer({ report }: Props) {
  const { colors, radii, typography, shadows, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useUser();
  const userDoc = useUserDoc();
  const inputRef = useRef<TextInput>(null);

  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const keyboardHeight = useKeyboardHeight();

  const isArchived = report.status === 'archived';
  const isAnonymous = !user || user.isAnonymous;

  const paddingBottom = keyboardHeight > 0 ? keyboardHeight + 52 : insets.bottom + 10;

  // Fade-out gradient over the scrolling content beneath the bar.
  const gradientColors: [string, string, string] = isDark
    ? ['rgba(15, 23, 42, 0)', 'rgba(15, 23, 42, 0.85)', 'rgba(15, 23, 42, 1)']
    : ['rgba(248, 250, 252, 0)', 'rgba(248, 250, 252, 0.85)', 'rgba(248, 250, 252, 1)'];

  if (isArchived) {
    return (
      <View style={[styles.container, { paddingBottom }]}>
        <LinearGradient
          colors={gradientColors}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View
          style={[
            styles.notice,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.full,
            },
          ]}
        >
          <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
          <Typography variant="caption" color={colors.textMuted}>
            This thread is closed.
          </Typography>
        </View>
      </View>
    );
  }

  if (isAnonymous) {
    const promptSignIn = () => {
      Alert.alert(
        'Account required',
        'Create an account to participate in the discussion.',
        [
          { text: 'Maybe later', style: 'cancel' },
          { text: 'Create account', onPress: () => router.push('/auth/login') },
        ],
      );
    };
    return (
      <View style={[styles.container, { paddingBottom }]}>
        <LinearGradient
          colors={gradientColors}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Pressable
          onPress={promptSignIn}
          style={({ pressed }) => [
            styles.signInPill,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.full,
              opacity: pressed ? 0.85 : 1,
            },
            shadows.sm,
          ]}
        >
          <Ionicons name="chatbubbles-outline" size={18} color={colors.textMuted} />
          <Typography variant="body" color={colors.textMuted} style={{ flex: 1 }}>
            Sign in to comment
          </Typography>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
    );
  }

  const handleSubmit = async () => {
    if (!user) return;
    const trimmed = text.trim();
    if (trimmed.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const authorName = userDoc?.displayName || user.displayName || 'Citizen';
      await submitComment(report.reportId, user.uid, authorName, trimmed);
      setText('');
      inputRef.current?.blur();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      Alert.alert('Couldn’t post', message);
    } finally {
      setSubmitting(false);
    }
  };

  const remaining = COMMENT_MAX_LENGTH - text.length;
  const overLimit = remaining < 0;
  const canSubmit = !submitting && text.trim().length > 0 && !overLimit;

  return (
    <View style={[styles.container, { paddingBottom }]}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View
        style={[
          styles.pill,
          {
            backgroundColor: colors.surface,
            borderColor: focused ? colors.primary : colors.border,
            borderRadius: radii.full,
          },
          shadows.sm,
        ]}
      >
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Share your thoughts…"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={COMMENT_MAX_LENGTH + 50}
          style={[
            styles.input,
            {
              color: colors.text,
              fontFamily: typography.family.regular,
              fontSize: typography.size.sm,
            },
          ]}
        />
        {focused && remaining < 100 ? (
          <Typography
            variant="caption"
            color={overLimit ? colors.danger : colors.textMuted}
            style={styles.counter}
          >
            {remaining}
          </Typography>
        ) : null}
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          hitSlop={6}
          style={({ pressed }) => [
            styles.sendBtn,
            {
              backgroundColor: canSubmit ? colors.primary : colors.border,
              opacity: pressed && canSubmit ? 0.85 : 1,
            },
          ]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons
              name="arrow-forward"
              size={18}
              color={canSubmit ? colors.white : colors.textMuted}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: 'center',
  },
  pill: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 50,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    paddingTop: Platform.OS === 'ios' ? 8 : 6,
    paddingBottom: Platform.OS === 'ios' ? 8 : 6,
    textAlignVertical: 'center',
  },
  counter: {
    alignSelf: 'center',
    fontSize: 11,
    marginHorizontal: 4,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: 1,
  },
  signInPill: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  notice: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    justifyContent: 'center',
  },
});
