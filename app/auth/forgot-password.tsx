import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';

import { sendPasswordReset } from '@/lib/auth';
import { AuthField } from '@/components/auth/AuthField';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

const GRADIENT = ['#34D399', '#10B981', '#059669'] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors, spacing, radii } = useTheme();

  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setFieldError('Please enter your email.');
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setFieldError('Enter a valid email address.');
      return;
    }
    setFieldError(undefined);
    setFormError(null);
    setLoading(true);
    try {
      await sendPasswordReset(trimmed);
      setSent(true);
    } catch (err: any) {
      switch (err?.code) {
        case 'auth/invalid-email':
          setFieldError('That email address looks invalid.');
          break;
        case 'auth/too-many-requests':
          setFormError('Too many attempts. Please wait a moment and try again.');
          break;
        case 'auth/network-request-failed':
          setFormError('Network error. Check your connection and try again.');
          break;
        default:
          setFormError(err?.message || 'Could not send the reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AnimatedButton
          onPress={() => router.back()}
          style={styles.backBtn}
          hapticFeedback="light"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </AnimatedButton>

        {sent ? (
          <Animated.View entering={FadeIn.duration(220)} style={styles.hero}>
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.orb}
            >
              <Ionicons name="checkmark" size={48} color="#FFFFFF" />
            </LinearGradient>
            <Typography
              variant="h1"
              align="center"
              style={{ marginTop: spacing.md, marginBottom: spacing.xs }}
            >
              Check your inbox
            </Typography>
            <Typography variant="body" color={colors.textMuted} align="center">
              If an account exists for {email.trim()}, we’ve sent a link to reset
              your password.
            </Typography>
            <AnimatedButton
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radii.md,
                  marginTop: spacing.xl,
                  alignSelf: 'stretch',
                },
              ]}
              onPress={() => router.back()}
              hapticFeedback="medium"
            >
              <Typography variant="body" weight="bold" color={colors.white}>
                Back to sign in
              </Typography>
            </AnimatedButton>
          </Animated.View>
        ) : (
          <>
            <View style={styles.hero}>
              <LinearGradient
                colors={GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.orb}
              >
                <Ionicons name="lock-closed" size={40} color="#FFFFFF" />
              </LinearGradient>
              <Typography
                variant="h1"
                align="center"
                style={{ marginTop: spacing.md, marginBottom: spacing.xs }}
              >
                Forgot password?
              </Typography>
              <Typography variant="body" color={colors.textMuted} align="center">
                Enter the email for your account and we’ll send you a link to
                reset your password.
              </Typography>
            </View>

            <Card padding="lg">
              <AuthField
                label="EMAIL"
                placeholder="you@example.com"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (fieldError) setFieldError(undefined);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                error={fieldError}
              />

              {formError && (
                <Animated.View
                  entering={FadeIn.duration(150)}
                  style={[
                    styles.banner,
                    { backgroundColor: colors.dangerMuted, borderRadius: radii.md },
                  ]}
                >
                  <Ionicons name="alert-circle" size={18} color={colors.danger} />
                  <Typography
                    variant="caption"
                    color={colors.danger}
                    style={styles.bannerText}
                  >
                    {formError}
                  </Typography>
                </Animated.View>
              )}

              <AnimatedButton
                style={[
                  styles.primaryBtn,
                  { backgroundColor: colors.primary, borderRadius: radii.md },
                  loading && styles.dim,
                ]}
                onPress={handleSend}
                disabled={loading}
                hapticFeedback={loading ? 'none' : 'medium'}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Typography variant="body" weight="bold" color={colors.white}>
                    Send reset link
                  </Typography>
                )}
              </AnimatedButton>
            </Card>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 32, paddingBottom: 48 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 8, padding: 4 },
  hero: { alignItems: 'center', marginBottom: 28 },
  orb: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginBottom: 16,
  },
  bannerText: { flex: 1 },
  primaryBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  dim: { opacity: 0.6 },
});
