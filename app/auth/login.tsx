import React, { useState } from 'react';
import {
  View, TextInput, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signUpWithEmail, signInWithEmail, signInWithGoogle } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { Typography } from '@/components/ui/Typography';
import { Card } from '@/components/ui/Card';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useTheme } from '@/theme';

type AuthTab = 'signin' | 'signup';

export default function LoginScreen() {
  const router = useRouter();
  const { refreshUserDoc } = useAuth();
  const { colors, spacing, radii } = useTheme();

  const [tab, setTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (tab === 'signup') {
      if (!displayName.trim()) { Alert.alert('Missing name', 'Please enter your name.'); return; }
      if (password !== confirmPassword) { Alert.alert('Password mismatch', 'Passwords do not match.'); return; }
      if (password.length < 6) { Alert.alert('Weak password', 'Password must be at least 6 characters.'); return; }
    }
    setLoading(true);
    try {
      if (tab === 'signup') {
        await signUpWithEmail(email.trim(), password, displayName.trim());
      } else {
        await signInWithEmail(email.trim(), password);
      }
      await refreshUserDoc();
      router.replace('/(tabs)/profile');
    } catch (err: any) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'This email is already registered. Try signing in.'
        : err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password'
        ? 'Invalid email or password.'
        : err.message || 'Authentication failed.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      await refreshUserDoc();
      router.replace('/(tabs)/profile');
    } catch (err: any) {
      if (err.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Google Sign In Failed', err.message || 'Please try again.');
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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <AnimatedButton onPress={() => router.back()} style={styles.backBtn} hapticFeedback="light">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </AnimatedButton>

        <View style={styles.heroSection}>
          <Typography variant="h1" style={{ fontSize: 60, marginBottom: spacing.sm }}>🏙️</Typography>
          <Typography variant="h1" style={{ marginBottom: spacing.xs }}>Join ReCiti</Typography>
          <Typography variant="body" color={colors.textMuted} align="center">
            Make your city better, one report at a time.
          </Typography>
        </View>

        {/* Tab Toggle */}
        <View style={[styles.tabBar, { backgroundColor: colors.border, borderRadius: radii.md }]}>
          {(['signin', 'signup'] as AuthTab[]).map((t) => (
            <AnimatedButton
              key={t}
              onPress={() => setTab(t)}
              hapticFeedback="light"
              style={[
                styles.tabBtn,
                tab === t && { backgroundColor: colors.primary, borderRadius: radii.sm }
              ]}
            >
              <Typography variant="body" weight="semiBold" color={tab === t ? colors.white : colors.textMuted}>
                {t === 'signin' ? 'Sign In' : 'Create Account'}
              </Typography>
            </AnimatedButton>
          ))}
        </View>

        {/* Form Card */}
        <Card style={styles.card}>
          {tab === 'signup' && (
            <View style={styles.inputGroup}>
              <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.label}>
                DISPLAY NAME
              </Typography>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, borderRadius: radii.md }]}
                placeholder="e.g. Arjun Sharma"
                placeholderTextColor={colors.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.label}>
              EMAIL
            </Typography>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, borderRadius: radii.md }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.label}>
              PASSWORD
            </Typography>
            <View style={[styles.passwordWrapper, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="Min. 6 characters"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <AnimatedButton onPress={() => setShowPassword(!showPassword)} hapticFeedback="light">
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
              </AnimatedButton>
            </View>
          </View>

          {tab === 'signup' && (
            <View style={styles.inputGroup}>
              <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.label}>
                CONFIRM PASSWORD
              </Typography>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, borderRadius: radii.md }]}
                placeholder="Repeat password"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          )}

          <AnimatedButton
            style={[styles.primaryBtn, { backgroundColor: colors.primary, borderRadius: radii.md }, loading && { opacity: 0.7 }]}
            onPress={handleEmailAuth}
            disabled={loading}
            hapticFeedback={loading ? 'none' : 'medium'}
          >
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Typography variant="body" weight="bold" color={colors.white}>
                  {tab === 'signin' ? 'Sign In' : 'Create Account'}
                </Typography>
            }
          </AnimatedButton>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Typography variant="caption" weight="semiBold" color={colors.textMuted} style={styles.dividerText}>
              OR
            </Typography>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Google Button */}
          <AnimatedButton
            style={[styles.googleBtn, { borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radii.md }]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
            hapticFeedback={googleLoading ? 'none' : 'light'}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Typography variant="h3" weight="bold" color="#4285F4">G</Typography>
                <Typography variant="body" weight="semiBold" color={colors.text}>
                  Continue with Google
                </Typography>
              </>
            )}
          </AnimatedButton>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 60, paddingTop: 40 },
  backBtn: { marginBottom: 16, alignSelf: 'flex-start' },
  heroSection: { alignItems: 'center', marginBottom: 32 },
  tabBar: { flexDirection: 'row', padding: 4, marginBottom: 24 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  card: { padding: 24 },
  inputGroup: { marginBottom: 16 },
  label: { letterSpacing: 1, marginBottom: 6 },
  input: {
    borderWidth: 1, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 16,
  },
  passwordWrapper: {
    borderWidth: 1, paddingHorizontal: 16,
    paddingVertical: 14, flexDirection: 'row', alignItems: 'center',
  },
  passwordInput: { flex: 1, fontSize: 16 },
  primaryBtn: {
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12 },
  googleBtn: {
    borderWidth: 1.5, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
  },
});
