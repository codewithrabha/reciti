import React, { useState } from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

import { OnboardingSlide } from '@/components/onboarding/OnboardingSlide';
import { ProgressDots } from '@/components/onboarding/ProgressDots';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Typography } from '@/components/ui/Typography';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useTheme } from '@/theme';

const GRADIENT = ['#34D399', '#10B981', '#059669'] as const;

/* ------------------------------- visuals -------------------------------- */

/**
 * Slide 1 Visual: Glowing City Orb
 */
function CityOrbVisual() {
  return (
    <LinearGradient
      colors={GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={visualStyles.orb}
    >
      <Ionicons name="business" size={88} color="#FFFFFF" />
      <View style={visualStyles.badgeOrb}>
        <Ionicons name="sparkles" size={18} color="#10B981" />
      </View>
    </LinearGradient>
  );
}

/**
 * Slide 2 Visual: 3-Step Civic Pipeline
 */
function StepsVisual() {
  const { colors } = useTheme();
  const steps: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { icon: 'camera', label: 'Spot' },
    { icon: 'checkmark-done', label: 'Verify' },
    { icon: 'flag', label: 'Resolve' },
  ];
  return (
    <View style={visualStyles.stepsRow}>
      {steps.map((step, i) => (
        <React.Fragment key={step.label}>
          <View style={visualStyles.step}>
            <LinearGradient
              colors={GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={visualStyles.stepCircle}
            >
              <Ionicons name={step.icon} size={28} color="#FFFFFF" />
            </LinearGradient>
            <Typography
              variant="caption"
              weight="semiBold"
              color={colors.textMuted}
              style={visualStyles.stepLabel}
            >
              {step.label}
            </Typography>
          </View>
          {i < steps.length - 1 && (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textMuted}
              style={visualStyles.stepArrow}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

/**
 * Slide 3 Visual: Zero-Broker Housing Card
 */
function HousingIntelVisual() {
  const { colors } = useTheme();
  return (
    <View style={[visualStyles.housingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <LinearGradient
        colors={['#10B981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={visualStyles.housingHeader}
      >
        <View style={visualStyles.housingHeaderLeft}>
          <Ionicons name="home" size={18} color="#FFFFFF" />
          <Typography variant="caption" weight="bold" color="#FFFFFF">
            Verified Stay Intel
          </Typography>
        </View>
        <View style={visualStyles.zeroBrokerPill}>
          <Typography variant="caption" weight="bold" color="#059669" style={{ fontSize: 10 }}>
            0% BROKER
          </Typography>
        </View>
      </LinearGradient>

      <View style={visualStyles.housingBody}>
        <View style={visualStyles.housingRow}>
          <View>
            <Typography variant="body" weight="bold" color={colors.text}>
              Student PG & Shared Flat
            </Typography>
            <Typography variant="caption" color={colors.textMuted}>
              Direct Landlord Contact
            </Typography>
          </View>
          <View style={[visualStyles.pricePill, { backgroundColor: colors.primaryMuted }]}>
            <Typography variant="caption" weight="bold" color={colors.primary}>
              ₹2,500
            </Typography>
            <Typography variant="caption" color={colors.primary} style={{ fontSize: 9 }}>
              /mo
            </Typography>
          </View>
        </View>

        <View style={visualStyles.amenityTags}>
          <View style={[visualStyles.tag, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="wifi" size={12} color={colors.primary} />
            <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>
              WiFi
            </Typography>
          </View>
          <View style={[visualStyles.tag, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="water" size={12} color={colors.primary} />
            <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>
              Water 24/7
            </Typography>
          </View>
          <View style={[visualStyles.tag, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="checkmark-circle" size={12} color="#10B981" />
            <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>
              Admin Verified
            </Typography>
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Slide 4 Visual: Directory & Events Pills
 */
function DirectoryPulseVisual() {
  const { colors } = useTheme();
  const items = [
    { icon: 'shield-checkmark', label: 'Emergency Helplines', sub: '24/7 Police & Hospitals' },
    { icon: 'calendar', label: 'Town Events & Pulse', sub: 'Festivals, Sports & Drives' },
    { icon: 'construct', label: 'Local Services Directory', sub: 'Electricians, Mechanics, Doctors' },
  ] as const;

  return (
    <View style={visualStyles.pulseList}>
      {items.map((item, idx) => (
        <View
          key={item.label}
          style={[
            visualStyles.pulseRow,
            { backgroundColor: colors.surface, borderColor: idx === 0 ? colors.primary : colors.border },
          ]}
        >
          <LinearGradient
            colors={GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={visualStyles.pulseIconCircle}
          >
            <Ionicons name={item.icon} size={18} color="#FFFFFF" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Typography variant="body" weight="semiBold" color={colors.text}>
              {item.label}
            </Typography>
            <Typography variant="caption" color={colors.textMuted}>
              {item.sub}
            </Typography>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      ))}
    </View>
  );
}

/**
 * Slide 5 Visual: Resident Pass & Location Beacon
 */
function ResidentPassVisual() {
  const { colors } = useTheme();
  return (
    <View style={visualStyles.residentPassContainer}>
      <LinearGradient
        colors={['#064e3b', '#065f46', '#047857']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={visualStyles.passCard}
      >
        <View style={visualStyles.passTop}>
          <View style={visualStyles.passChip}>
            <Ionicons name="card" size={20} color="#34d399" />
          </View>
          <View style={visualStyles.passTierBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
            <Typography variant="caption" weight="bold" color="#FFFFFF">
              GUARDIAN TIER
            </Typography>
          </View>
        </View>

        <Typography variant="subtitle" weight="bold" color="#FFFFFF" style={{ marginTop: 14 }}>
          ReCiti Resident Pass
        </Typography>
        <Typography variant="caption" color="#a7f3d0" style={{ marginTop: 2 }}>
          Civic Points: 450 pts · Verified Citizen
        </Typography>

        <View style={visualStyles.passFooter}>
          <View style={visualStyles.passIndicator}>
            <View style={visualStyles.livePulseDot} />
            <Typography variant="caption" color="#6ee7b7" style={{ fontSize: 10 }}>
              Live Hyperlocal Sync
            </Typography>
          </View>
          <Ionicons name="location" size={18} color="#34d399" />
        </View>
      </LinearGradient>
    </View>
  );
}

/* -------------------------------- slides -------------------------------- */

const SLIDES = [
  {
    visual: <CityOrbVisual />,
    headline: 'Your City, Connected',
    body: 'The all-in-one smart city companion. Navigate, shape, and experience your town with real-time community transparency.',
  },
  {
    visual: <StepsVisual />,
    headline: 'Spot. Report. Resolve.',
    body: 'Notice a broken streetlight or open pothole? Capture photos, let neighbours verify, and follow through to community fix.',
  },
  {
    visual: <HousingIntelVisual />,
    headline: 'Zero-Broker Rentals & PGs',
    body: 'Find verified student accommodations and shared rooms with direct landlord contacts. 100% zero brokerage.',
  },
  {
    visual: <DirectoryPulseVisual />,
    headline: 'Local Directory & Events',
    body: 'Instant access to emergency helplines, local essential services, and cultural weekend gatherings happening right around you.',
  },
  {
    visual: <ResidentPassVisual />,
    headline: 'Unlock Your Resident Pass',
    body: 'Earn Civic Points, climb citizen tiers, and unlock contacts. Enable location to discover reports and verified stays nearby.',
  },
];

/* -------------------------------- screen -------------------------------- */

export default function OnboardingScreen() {
  const { colors, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeOnboarding } = useOnboarding();
  const { width, height } = useWindowDimensions();

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);
  const [index, setIndex] = useState(0);

  const lastIndex = SLIDES.length - 1;
  const onLastSlide = index === lastIndex;

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  const goToSlide = (i: number) => {
    scrollRef.current?.scrollTo({ x: width * i, animated: true });
  };

  const handleGetStarted = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      // Continue regardless of accept/deny
    } catch (error) {
      // Continue anyway
    } finally {
      proceedToLogin();
    }
  };

  const proceedToLogin = async () => {
    router.replace('/auth/login');
    await completeOnboarding();
  };

  const handleExplore = async () => {
    await completeOnboarding();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!onLastSlide && (
        <AnimatedButton
          onPress={() => goToSlide(lastIndex)}
          hapticFeedback="light"
          style={[styles.skip, { top: insets.top + 8 }]}
        >
          <Typography variant="body" weight="semiBold" color={colors.textMuted}>
            Skip
          </Typography>
          <Ionicons name="arrow-forward" size={15} color={colors.textMuted} />
        </AnimatedButton>
      )}

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      >
        {SLIDES.map((slide, i) => (
          <OnboardingSlide
            key={i}
            width={width}
            height={height}
            index={i}
            scrollX={scrollX}
            visual={slide.visual}
            headline={slide.headline}
            body={slide.body}
          />
        ))}
      </Animated.ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        <ProgressDots
          count={SLIDES.length}
          scrollX={scrollX}
          slideWidth={width}
        />

        <View style={styles.actions}>
          {onLastSlide ? (
            <>
              <AnimatedButton
                onPress={handleGetStarted}
                hapticFeedback="success"
                style={[
                  styles.primaryBtn,
                  { backgroundColor: colors.primary, borderRadius: radii.md },
                ]}
              >
                <Typography variant="body" weight="bold" color={colors.white}>
                  Enable Location & Get Started
                </Typography>
              </AnimatedButton>
              <AnimatedButton
                onPress={handleExplore}
                hapticFeedback="light"
                style={styles.linkBtn}
              >
                <Typography
                  variant="body"
                  weight="semiBold"
                  color={colors.textMuted}
                >
                  Explore as Guest
                </Typography>
              </AnimatedButton>
            </>
          ) : (
            <AnimatedButton
              onPress={() => goToSlide(index + 1)}
              hapticFeedback="medium"
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary, borderRadius: radii.md },
              ]}
            >
              <Typography variant="body" weight="bold" color={colors.white}>
                Continue
              </Typography>
            </AnimatedButton>
          )}
        </View>
      </View>
    </View>
  );
}

/* -------------------------------- styles -------------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1 },
  skip: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 16,
    paddingHorizontal: 24,
  },
  actions: {
    marginTop: 20,
  },
  primaryBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
});

const visualStyles = StyleSheet.create({
  orb: {
    width: 190,
    height: 190,
    borderRadius: 95,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  badgeOrb: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: {
    alignItems: 'center',
    width: 76,
  },
  stepCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  stepLabel: {
    marginTop: 10,
  },
  stepArrow: {
    marginBottom: 24,
  },
  housingCard: {
    width: 290,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  housingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  housingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zeroBrokerPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  housingBody: {
    padding: 14,
    gap: 12,
  },
  housingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 2,
  },
  amenityTags: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  pulseList: {
    width: 300,
    gap: 10,
  },
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  pulseIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  residentPassContainer: {
    width: 300,
    alignItems: 'center',
  },
  passCard: {
    width: '100%',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  passTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passChip: {
    width: 36,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  passFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  passIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34d399',
  },
});
