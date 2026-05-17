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

function GradientOrb({ icon }: { icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <LinearGradient
      colors={GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={visualStyles.orb}
    >
      <Ionicons name={icon} size={92} color="#FFFFFF" />
    </LinearGradient>
  );
}

function StepsVisual() {
  const { colors } = useTheme();
  const steps: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { icon: 'camera', label: 'Capture' },
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
              size={20}
              color={colors.textMuted}
              style={visualStyles.stepArrow}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

function TierLadderVisual() {
  const { colors } = useTheme();
  // Top-to-bottom: the rung you climb toward sits at the top.
  const tiers: {
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    widthPct: `${number}%`;
    opacity: number;
  }[] = [
    { name: 'Guardian', icon: 'shield-checkmark', widthPct: '100%', opacity: 1 },
    { name: 'Advocate', icon: 'megaphone', widthPct: '86%', opacity: 0.88 },
    { name: 'Resident', icon: 'home', widthPct: '72%', opacity: 0.76 },
    { name: 'Tourist', icon: 'walk', widthPct: '60%', opacity: 0.66 },
  ];
  return (
    <View style={visualStyles.ladder}>
      {tiers.map((tier, i) => {
        const isTop = i === 0;
        return (
          <View
            key={tier.name}
            style={[
              visualStyles.rung,
              {
                width: tier.widthPct,
                opacity: tier.opacity,
                backgroundColor: isTop ? colors.primary : colors.surface,
                borderColor: isTop ? colors.primary : colors.border,
              },
            ]}
          >
            <View
              style={[
                visualStyles.rungIcon,
                {
                  backgroundColor: isTop
                    ? 'rgba(255,255,255,0.22)'
                    : colors.primaryMuted,
                },
              ]}
            >
              <Ionicons
                name={tier.icon}
                size={16}
                color={isTop ? '#FFFFFF' : colors.primary}
              />
            </View>
            <Typography
              variant="body"
              weight={isTop ? 'bold' : 'semiBold'}
              color={isTop ? '#FFFFFF' : colors.text}
            >
              {tier.name}
            </Typography>
          </View>
        );
      })}
    </View>
  );
}

/* -------------------------------- slides -------------------------------- */

const SLIDES = [
  {
    visual: <GradientOrb icon="planet" />,
    headline: 'Welcome to ReCiti',
    body: 'Your city, in your hands. Spot the wins, flag the fails — one photo at a time.',
  },
  {
    visual: <StepsVisual />,
    headline: 'Report. Verify. Resolve.',
    body: 'Capture a civic issue. Neighbours verify it. Track it until it’s fixed.',
  },
  {
    visual: <TierLadderVisual />,
    headline: 'Tourist to Guardian',
    body: 'Earn Civic Points for every report and verification. The more you care, the higher you climb.',
  },
  {
    visual: <GradientOrb icon="location" />,
    headline: 'Ready to fix your city?',
    body: 'ReCiti uses your location to show reports near you and tag the issues you find.',
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
    // Pre-primed by slide 4 — ask for location before handing off to sign-in.
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch {
      // Permission flow failed/declined — continue regardless.
    }
    // Move to the (unprotected) auth screen first, then flip the guard so the
    // onboarding screen drops out of the stack cleanly behind us.
    router.replace('/auth/login');
    await completeOnboarding();
  };

  const handleExplore = async () => {
    // Completing onboarding flips the route guard, which lands the user in (tabs).
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
            paddingBottom: insets.bottom + 24,
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
                  Get Started
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
                  Explore first
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
    marginTop: 24,
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
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
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
  ladder: {
    width: 260,
    alignItems: 'center',
    gap: 10,
  },
  rung: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 9999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  rungIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
