import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, Alert, useColorScheme, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signUpWithEmail, signInWithEmail, signInWithGoogle } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';

type AuthTab = 'signin' | 'signup';

export default function LoginScreen() {
  const router = useRouter();
  const { refreshUserDoc } = useAuth();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  const [tab, setTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const bg = dark ? '#0f172a' : '#f8fafc';
  const cardBg = dark ? '#1e293b' : '#ffffff';
  const textPrimary = dark ? '#f1f5f9' : '#0f172a';
  const textMuted = dark ? '#94a3b8' : '#64748b';
  const border = dark ? '#334155' : '#e2e8f0';
  const inputBg = dark ? '#0f172a' : '#f8fafc';

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
      style={[styles.container, { backgroundColor: bg }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </Pressable>

        <View style={styles.heroSection}>
          <Text style={styles.heroEmoji}>🏙️</Text>
          <Text style={[styles.heroTitle, { color: textPrimary }]}>Join ReCiti</Text>
          <Text style={[styles.heroSubtitle, { color: textMuted }]}>
            Make your city better, one report at a time.
          </Text>
        </View>

        {/* Tab Toggle */}
        <View style={[styles.tabBar, { backgroundColor: dark ? '#1e293b' : '#f1f5f9' }]}>
          {(['signin', 'signup'] as AuthTab[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabBtn, tab === t && { backgroundColor: '#10b981' }]}
            >
              <Text style={[styles.tabText, { color: tab === t ? 'white' : textMuted }]}>
                {t === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          {tab === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: textMuted }]}>DISPLAY NAME</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: textPrimary, borderColor: border }]}
                placeholder="e.g. Arjun Sharma"
                placeholderTextColor={textMuted}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textMuted }]}>EMAIL</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: textPrimary, borderColor: border }]}
              placeholder="you@example.com"
              placeholderTextColor={textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textMuted }]}>PASSWORD</Text>
            <View style={[styles.passwordWrapper, { backgroundColor: inputBg, borderColor: border }]}>
              <TextInput
                style={[styles.passwordInput, { color: textPrimary }]}
                placeholder="Min. 6 characters"
                placeholderTextColor={textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={textMuted} />
              </Pressable>
            </View>
          </View>

          {tab === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: textMuted }]}>CONFIRM PASSWORD</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: textPrimary, borderColor: border }]}
                placeholder="Repeat password"
                placeholderTextColor={textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          )}

          <Pressable
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={handleEmailAuth}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={styles.primaryBtnText}>{tab === 'signin' ? 'Sign In' : 'Create Account'}</Text>
            }
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: border }]} />
            <Text style={[styles.dividerText, { color: textMuted }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: border }]} />
          </View>

          {/* Google Button */}
          <Pressable
            style={[styles.googleBtn, { borderColor: border, backgroundColor: cardBg }]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#10b981" />
            ) : (
              <>
                <Text style={styles.googleG}>G</Text>
                <Text style={[styles.googleBtnText, { color: textPrimary }]}>Continue with Google</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 60 },
  backBtn: { marginBottom: 16 },
  heroSection: { alignItems: 'center', marginBottom: 28 },
  heroEmoji: { fontSize: 52, marginBottom: 8 },
  heroTitle: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  heroSubtitle: { fontSize: 14, textAlign: 'center' },
  tabBar: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabText: { fontWeight: '700', fontSize: 14 },
  card: { borderRadius: 20, padding: 20, borderWidth: 1 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  input: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15,
  },
  passwordWrapper: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, flexDirection: 'row', alignItems: 'center',
  },
  passwordInput: { flex: 1, fontSize: 15 },
  primaryBtn: {
    backgroundColor: '#10b981', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  primaryBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 12, fontWeight: '600' },
  googleBtn: {
    borderWidth: 1.5, borderRadius: 12, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  googleG: { fontSize: 18, fontWeight: '900', color: '#4285F4' },
  googleBtnText: { fontWeight: '600', fontSize: 15 },
});
