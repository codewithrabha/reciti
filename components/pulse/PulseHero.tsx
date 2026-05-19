import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Typography } from '@/components/ui/Typography';

const GRADIENT = ['#34D399', '#10B981', '#059669'] as const;
const RING_SIZE = 150;

/** One concentric ring that scales up and fades out on a loop. */
function PulseRing({ delay }: { delay: number }) {
  const progress = useSharedValue(0);

  // Loop only while the Pulse tab is focused — bottom-tab screens stay mounted,
  // so an unconditional infinite animation would keep running off-screen.
  useFocusEffect(
    useCallback(() => {
      progress.value = withDelay(
        delay,
        withRepeat(
          withTiming(1, { duration: 2600, easing: Easing.out(Easing.cubic) }),
          -1,
          false,
        ),
      );
      return () => {
        progress.value = 0;
      };
    }, [delay, progress]),
  );

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.55 + progress.value * 0.95 }],
    opacity: 0.45 * (1 - progress.value),
  }));

  return <Animated.View style={[styles.ring, style]} />;
}

interface PulseHeroProps {
  /** Active (non-archived) reports tracked nearby. */
  activeCount: number;
  thisWeek: number;
  lastWeek: number;
}

export function PulseHero({ activeCount, thisWeek, lastWeek }: PulseHeroProps) {
  const delta = thisWeek - lastWeek;
  const trend =
    delta > 0
      ? { icon: 'trending-up' as const, text: `${delta} more than last week` }
      : delta < 0
        ? { icon: 'trending-down' as const, text: `${Math.abs(delta)} fewer than last week` }
        : { icon: 'remove' as const, text: 'same as last week' };

  return (
    <LinearGradient
      colors={GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.rings} pointerEvents="none">
        <PulseRing delay={0} />
        <PulseRing delay={870} />
        <PulseRing delay={1740} />
      </View>

      <Typography
        variant="caption"
        weight="bold"
        color="rgba(255,255,255,0.85)"
        style={styles.kicker}
      >
        CIVIC PULSE
      </Typography>
      <Typography weight="bold" color="#FFFFFF" style={styles.bigNumber}>
        {activeCount}
      </Typography>
      <Typography variant="body" color="rgba(255,255,255,0.92)" align="center">
        active reports tracked near you
      </Typography>

      <View style={styles.trendPill}>
        <Ionicons name={trend.icon} size={14} color="#FFFFFF" />
        <Typography variant="caption" weight="semiBold" color="#FFFFFF">
          {thisWeek} new this week · {trend.text}
        </Typography>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  rings: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  kicker: { letterSpacing: 2, marginBottom: 4 },
  bigNumber: { fontSize: 64, lineHeight: 70 },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9999,
  },
});
