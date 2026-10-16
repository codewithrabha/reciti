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
import { Image } from 'expo-image';
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

/* -------------------------------- slides -------------------------------- */

const SLIDES = [
  {
    image: require('@/assets/images/onboarding/reciti-intro.png'),
    headline: 'Neighborhood in Your Pocket',
    body: 'Live smarter in your town. Discover trusted local pros, explore essential directories, and shape a better community.',
    buttonLabel: 'Continue',
  },
  {
    image: require('@/assets/images/onboarding/services-stores.png'),
    headline: 'Trusted Hands for Every Job',
    body: 'Need an electrician, cleaner, or appliance repair? Book background-checked professionals with upfront pricing and verified reviews.',
    buttonLabel: 'Continue',
  },
  {
    image: require('@/assets/images/onboarding/city-directories.png'),
    headline: 'The Contacts You Actually Need',
    body: 'Emergency dispatch, water boards, electricity helplines, and government desks — community verified, updated, and ready to dial.',
    buttonLabel: 'Continue',
  },
  {
    image: require('@/assets/images/onboarding/house-rentals.png'),
    headline: 'Say Goodbye to Broker Fees',
    body: 'Explore verified rooms and rental homes with clear rent, real photos, and direct landlord chat. Keep your hard-earned money.',
    buttonLabel: 'Continue',
  },
  {
    image: require('@/assets/images/onboarding/report-city-issues.png'),
    headline: 'Spot It. Snap It. Get It Fixed',
    body: 'See a pothole, broken streetlight, or garbage dump? Snap a quick photo, rally neighbor votes, and hold city authorities accountable.',
    buttonLabel: 'GPS & Login',
  },
];

/* -------------------------------- screen -------------------------------- */

export default function OnboardingScreen() {
  const { colors, isDark } = useTheme();
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
      await Location.requestForegroundPermissionsAsync();
    } catch (error) {
      // Continue anyway even if denied
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
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
      {/* Ambient Top Glow */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(16, 185, 129, 0.16)', 'rgba(9, 13, 22, 0)']
            : ['rgba(167, 243, 208, 0.40)', 'rgba(248, 250, 252, 0)']
        }
        style={styles.topAmbientGlow}
        pointerEvents="none"
      />

      {/* Top Navigation Action Button: 'Skip' on slides 1-4, 'Explore as Guest' on last slide */}
      <AnimatedButton
        onPress={onLastSlide ? handleExplore : () => goToSlide(lastIndex)}
        hapticFeedback="light"
        style={[styles.skip, { top: insets.top + 8 }]}
      >
        <Typography
          variant="body"
          weight="regular"
          color={isDark ? colors.textMuted : '#64748B'}
          style={{ fontSize: 14 }}
        >
          {onLastSlide ? 'Guest Mode' : 'Skip'}
        </Typography>
        <Ionicons
          name="chevron-forward"
          size={14}
          color={isDark ? colors.textMuted : '#64748B'}
        />
      </AnimatedButton>

      {/* Horizontal Carousel */}
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
            visual={
              <Image
                source={slide.image}
                style={styles.slideImage}
                contentFit="contain"
                transition={200}
              />
            }
            headline={slide.headline}
            body={slide.body}
          />
        ))}
      </Animated.ScrollView>

      {/* Footer Actions & Indicator */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 18,
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
            <AnimatedButton
              onPress={handleGetStarted}
              hapticFeedback="success"
              style={styles.primaryBtnWrapper}
            >
              <LinearGradient
                colors={['#2DD4BF', '#10B981']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtnGradient}
              >
                <Typography variant="body" weight="bold" color="#FFFFFF" style={styles.btnText}>
                  GPS & Login
                </Typography>
              </LinearGradient>
            </AnimatedButton>
          ) : (
            <AnimatedButton
              onPress={() => goToSlide(index + 1)}
              hapticFeedback="medium"
              style={styles.primaryBtnWrapper}
            >
              <LinearGradient
                colors={['#2DD4BF', '#10B981']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtnGradient}
              >
                <Typography variant="body" weight="bold" color="#FFFFFF" style={styles.btnText}>
                  Continue
                </Typography>
              </LinearGradient>
            </AnimatedButton>
          )}
        </View>
      </View>
    </View>
  );
}

/* -------------------------------- styles -------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topAmbientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
  },
  skip: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  slideImage: {
    width: '135%',
    height: '135%',
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
    marginTop: 22,
  },
  primaryBtnWrapper: {
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  btnText: {
    fontSize: 16,
    letterSpacing: 0.2,
  },
  linkBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
});
