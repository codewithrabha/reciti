import React, { useEffect, useState } from 'react';
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
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '@/lib/auth';
import { useRefreshUserDoc } from '@/hooks/useAuth';
import { AuthField } from '@/components/auth/AuthField';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/theme';

type AuthTab = 'signin' | 'signup';
type FieldErrors = {
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
};

const GRADIENT = ['#34D399', '#10B981', '#059669'] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function authErrorMessage(err: any): string {
  switch (err?.code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Try signing in instead.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Incorrect email or password.';
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      return err?.message || 'Something went wrong. Please try again.';
  }
}

export default function LoginScreen() {
  const router = useRouter();
  const refreshUserDoc = useRefreshUserDoc();
  const { colors, spacing, radii } = useTheme();

  const [tab, setTab] = useState<AuthTab>('signin');
  const isSignup = tab === 'signup';

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accepted, setAccepted] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const busy = loading || googleLoading;

  // Sliding tab indicator.
  const [tabBarW, setTabBarW] = useState(0);
  const segW = tabBarW > 0 ? (tabBarW - 8) / 2 : 0;
  const indicatorX = useSharedValue(0);
  useEffect(() => {
    indicatorX.value = withSpring(isSignup ? segW : 0, {
      damping: 18,
      stiffness: 220,
      // Stop exactly at the target — without this the underdamped spring
      // overshoots and the indicator briefly slides past the tab bar edge.
      overshootClamping: true,
    });
  }, [isSignup, segW, indicatorX]);
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const switchTab = (next: AuthTab) => {
    if (next === tab) return;
    setTab(next);
    setErrors({});
    setFormError(null);
  };

  const clearError = (key: keyof FieldErrors) =>
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const validate = (): boolean => {
    const next: FieldErrors = {};
    const trimmedEmail = email.trim();

    if (isSignup && !displayName.trim()) next.displayName = 'Please enter your name.';
    if (!trimmedEmail) next.email = 'Please enter your email.';
    else if (!EMAIL_RE.test(trimmedEmail)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Please enter your password.';
    else if (isSignup && password.length < 6) next.password = 'Use at least 6 characters.';
    if (isSignup && confirmPassword !== password) {
      next.confirmPassword = 'Passwords don’t match.';
    }
    if (isSignup && !accepted) {
      next.terms = 'Please accept the Privacy Policy and Terms to continue.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleEmailAuth = async () => {
    if (!validate()) return;
    setFormError(null);
    setLoading(true);
    try {
      if (isSignup) {
        await signUpWithEmail(email.trim(), password, displayName.trim());
      } else {
        await signInWithEmail(email.trim(), password);
      }
      await refreshUserDoc();
      router.replace('/(tabs)/profile');
    } catch (err: any) {
      setFormError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // Google can create an account on first use, so require consent on the
    // Create Account tab (where the checkbox is shown).
    if (isSignup && !accepted) {
      setErrors((prev) => ({
        ...prev,
        terms: 'Please accept the Privacy Policy and Terms to continue.',
      }));
      return;
    }
    setFormError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      await refreshUserDoc();
      router.replace('/(tabs)/profile');
    } catch (err: any) {
      if (err?.code !== 'SIGN_IN_CANCELLED') {
        setFormError(err?.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
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


        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient
            colors={GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.orb}
          >
            <Ionicons name="earth" size={44} color="#FFFFFF" />
          </LinearGradient>
          <Typography
            variant="h1"
            align="center"
            style={{ marginTop: spacing.md, marginBottom: spacing.xs }}
          >
            {isSignup ? 'Join ReCiti' : 'Welcome back'}
          </Typography>
          <Typography variant="body" color={colors.textMuted} align="center">
            {isSignup
              ? 'Start as a Tourist — climb to Guardian as you help your city.'
              : 'Sign in to pick up where you left off.'}
          </Typography>
        </View>

        {/* Tab toggle */}
        <View
          style={[styles.tabBar, { backgroundColor: colors.border, borderRadius: radii.md }]}
          onLayout={(e) => setTabBarW(e.nativeEvent.layout.width)}
        >
          {segW > 0 && (
            <Animated.View
              style={[
                styles.tabIndicator,
                { width: segW, backgroundColor: colors.primary, borderRadius: radii.sm },
                indicatorStyle,
              ]}
            />
          )}
          {(['signin', 'signup'] as AuthTab[]).map((t) => (
            <AnimatedButton
              key={t}
              onPress={() => switchTab(t)}
              hapticFeedback="light"
              scaleTo={0.97}
              style={styles.tabBtn}
            >
              <Typography
                variant="body"
                weight="semiBold"
                color={tab === t ? colors.white : colors.textMuted}
              >
                {t === 'signin' ? 'Sign In' : 'Create Account'}
              </Typography>
            </AnimatedButton>
          ))}
        </View>

        {/* Form */}
        <Card padding="lg">
          {isSignup && (
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
            >
              <AuthField
                label="DISPLAY NAME"
                placeholder="e.g. Arjun Sharma"
                value={displayName}
                onChangeText={(t) => {
                  setDisplayName(t);
                  clearError('displayName');
                }}
                autoCapitalize="words"
                error={errors.displayName}
              />
            </Animated.View>
          )}

          <Animated.View layout={LinearTransition.duration(200)}>
            <AuthField
              label="EMAIL"
              placeholder="you@example.com"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                clearError('email');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              error={errors.email}
            />
          </Animated.View>

          <Animated.View layout={LinearTransition.duration(200)}>
            <AuthField
              label="PASSWORD"
              placeholder={isSignup ? 'Min. 6 characters' : 'Your password'}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                clearError('password');
              }}
              isPassword
              error={errors.password}
            />
          </Animated.View>

          {isSignup && (
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
            >
              <AuthField
                label="CONFIRM PASSWORD"
                placeholder="Repeat password"
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  clearError('confirmPassword');
                }}
                isPassword
                error={errors.confirmPassword}
              />
            </Animated.View>
          )}

          {isSignup && (
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
              style={styles.consentBlock}
            >
              <AnimatedButton
                onPress={() => {
                  setAccepted((a) => !a);
                  clearError('terms');
                }}
                hapticFeedback="light"
                scaleTo={0.97}
                style={styles.consentRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: accepted }}
                accessibilityLabel="I agree to the Privacy Policy and Terms & Conditions"
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: errors.terms
                        ? colors.danger
                        : accepted
                          ? colors.primary
                          : colors.border,
                      backgroundColor: accepted ? colors.primary : 'transparent',
                      borderRadius: radii.sm,
                    },
                  ]}
                >
                  {accepted && <Ionicons name="checkmark" size={14} color={colors.white} />}
                </View>
                <Typography variant="caption" color={colors.textMuted} style={styles.consentText}>
                  I agree to the{' '}
                  <Typography
                    variant="caption"
                    weight="semiBold"
                    color={colors.primary}
                    onPress={() => router.push('/privacy-policy')}
                  >
                    Privacy Policy
                  </Typography>
                  {' '}and{' '}
                  <Typography
                    variant="caption"
                    weight="semiBold"
                    color={colors.primary}
                    onPress={() => router.push('/terms')}
                  >
                    Terms &amp; Conditions
                  </Typography>
                  .
                </Typography>
              </AnimatedButton>
              {!!errors.terms && (
                <Typography variant="caption" color={colors.danger} style={styles.consentError}>
                  {errors.terms}
                </Typography>
              )}
            </Animated.View>
          )}

          {!isSignup && (
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
              style={styles.forgotRow}
            >
              <AnimatedButton
                onPress={() => router.push('/auth/forgot-password')}
                hapticFeedback="light"
                hitSlop={8}
              >
                <Typography variant="caption" weight="semiBold" color={colors.primary}>
                  Forgot password?
                </Typography>
              </AnimatedButton>
            </Animated.View>
          )}

          {formError && (
            <Animated.View
              entering={FadeIn.duration(150)}
              style={[
                styles.banner,
                { backgroundColor: colors.dangerMuted, borderRadius: radii.md },
              ]}
            >
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Typography variant="caption" color={colors.danger} style={styles.bannerText}>
                {formError}
              </Typography>
            </Animated.View>
          )}

          <Animated.View layout={LinearTransition.duration(200)}>
            <AnimatedButton
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary, borderRadius: radii.md },
                busy && styles.dim,
              ]}
              onPress={handleEmailAuth}
              disabled={busy}
              hapticFeedback={busy ? 'none' : 'medium'}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Typography variant="body" weight="bold" color={colors.white}>
                  {isSignup ? 'Create Account' : 'Sign In'}
                </Typography>
              )}
            </AnimatedButton>
          </Animated.View>

          <Animated.View layout={LinearTransition.duration(200)} style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Typography
              variant="caption"
              weight="semiBold"
              color={colors.textMuted}
              style={styles.dividerText}
            >
              OR
            </Typography>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </Animated.View>

          <Animated.View layout={LinearTransition.duration(200)}>
            <AnimatedButton
              style={[
                styles.googleBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  borderRadius: radii.md,
                },
                busy && styles.dim,
              ]}
              onPress={handleGoogleSignIn}
              disabled={busy}
              hapticFeedback={busy ? 'none' : 'light'}
            >
              {googleLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color={colors.text} />
                  <Typography variant="body" weight="semiBold" color={colors.text}>
                    Continue with Google
                  </Typography>
                </>
              )}
            </AnimatedButton>
          </Animated.View>
        </Card>

        {/* Guest escape hatch */}
        <AnimatedButton
          onPress={() => router.replace('/(tabs)')}
          hapticFeedback="light"
          style={styles.guestBtn}
          disabled={busy}
        >
          <Typography variant="body" color={colors.textMuted} align="center">
            Not ready?{' '}
            <Typography variant="body" weight="semiBold" color={colors.primary}>
              Browse as a guest
            </Typography>
          </Typography>
        </AnimatedButton>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 32, paddingBottom: 48 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 8, padding: 4 },
  hero: { alignItems: 'center',marginVertical: 25 },
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
  tabBar: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 24,
    position: 'relative',
  },
  tabIndicator: { position: 'absolute', top: 4, left: 4, bottom: 4 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', zIndex: 1 },
  forgotRow: { alignItems: 'flex-end', marginTop: -6, marginBottom: 10 },
  consentBlock: { marginTop: 4, marginBottom: 6 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  consentText: { flex: 1, lineHeight: 19 },
  consentError: { marginTop: 6, marginLeft: 32 },
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
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12 },
  googleBtn: {
    borderWidth: 1.5,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  guestBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,  
  },
});
