import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  FlatList,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CityNotice } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

const FIXED_CARD_HEIGHT = 192;
const CARD_GAP = 12;
const AUTO_SLIDE_INTERVAL = 5500; // 5.5 seconds
const MAX_HERO_NOTICES = 5;

interface NoticeBoardCarouselProps {
  notices: CityNotice[];
  cityName?: string | null;
}

export function NoticeBoardCarousel({ notices, cityName }: NoticeBoardCarouselProps) {
  const { colors, spacing, radii } = useTheme();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  // Responsive card geometry
  const cardWidth = Math.min(screenWidth - 32, 440);

  // Cap to top 5 notices on the Home hero
  const displayNotices = notices.slice(0, MAX_HERO_NOTICES);
  const count = displayNotices.length;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  const flatListRef = useRef<FlatList<CityNotice>>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // AppState observer: pause auto-slide when app is backgrounded
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
    });
    return () => subscription.remove();
  }, []);

  // Auto-slide controller
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (count <= 1 || isUserInteracting || appState !== 'active') return;

    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % count;
        flatListRef.current?.scrollToOffset({
          offset: next * (cardWidth + CARD_GAP),
          animated: true,
        });
        return next;
      });
    }, AUTO_SLIDE_INTERVAL);
  }, [count, isUserInteracting, appState, cardWidth]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, [startTimer, stopTimer, count, appState]);

  // Handle touch drag
  const handleScrollBeginDrag = () => {
    setIsUserInteracting(true);
    stopTimer();
  };

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (cardWidth + CARD_GAP));
    const clamped = Math.max(0, Math.min(index, count - 1));
    setActiveIndex(clamped);
    setIsUserInteracting(false);
  };

  const handleAction = (notice: CityNotice) => {
    if (notice.actionType === 'route' && notice.actionUrl) {
      router.push(notice.actionUrl as any);
    } else if (notice.actionType === 'phone' && notice.actionUrl) {
      Linking.openURL(notice.actionUrl);
    } else if (notice.actionType === 'link' && notice.actionUrl) {
      Linking.openURL(notice.actionUrl);
    }
    // Informational cards without an action will navigate to the dedicated screen once built
  };

  if (count === 0) return null;

  // Category tone styles
  const getCategoryConfig = (notice: CityNotice) => {
    switch (notice.category) {
      case 'alert':
        return {
          icon: 'warning' as const,
          badgeVariant: 'danger' as const,
          accentColor: colors.danger,
          bgGlow: colors.dangerMuted,
        };
      case 'announcement':
        return {
          icon: 'megaphone' as const,
          badgeVariant: 'primary' as const,
          accentColor: colors.primary,
          bgGlow: colors.primaryMuted,
        };
      case 'spotlight':
        return {
          icon: 'ribbon' as const,
          badgeVariant: 'warning' as const,
          accentColor: '#10B981',
          bgGlow: 'rgba(16, 185, 129, 0.12)',
        };
      case 'app_update':
        return {
          icon: 'rocket-outline' as const,
          badgeVariant: 'primary' as const,
          accentColor: '#8B5CF6',
          bgGlow: 'rgba(139, 92, 246, 0.15)',
        };
      case 'banner':
        return {
          icon: 'image-outline' as const,
          badgeVariant: 'default' as const,
          accentColor: '#0EA5E9',
          bgGlow: 'rgba(14, 165, 233, 0.15)',
        };
      case 'advisory':
      default:
        return {
          icon: 'information-circle' as const,
          badgeVariant: 'default' as const,
          accentColor: colors.textMuted,
          bgGlow: colors.surface,
        };
    }
  };

  return (
    <View style={styles.wrapper}>
      
      {/* Snap-paging Carousel */}
      <FlatList
        ref={flatListRef}
        data={displayNotices}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + CARD_GAP}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        renderItem={({ item: notice }) => {
          // ── Case A: Full Image Banner Card (Image Only, Borderless) ────────
          if (notice.displayType === 'image_banner' && notice.imageUrl) {
            return (
              <AnimatedButton
                onPress={() => handleAction(notice)}
                scaleTo={0.99}
                style={[
                  styles.imageBannerCard,
                  { width: cardWidth },
                ]}
              >
                <Image
                  source={{ uri: notice.imageUrl }}
                  style={styles.bannerImage}
                  contentFit="cover"
                  transition={250}
                />
              </AnimatedButton>
            );
          }

          // ── Case B: Standard & Feature Card (Borderless Surface + Badges) ─
          const cfg = getCategoryConfig(notice);

          return (
            <AnimatedButton
              onPress={() => handleAction(notice)}
              scaleTo={0.99}
              style={[
                styles.noticeCard,
                {
                  width: cardWidth,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <View>
                {/* Category & Status Row */}
                <View style={styles.cardHeader}>
                  <View style={styles.badgeCluster}>
                    <View style={[styles.iconPill, { backgroundColor: cfg.bgGlow }]}>
                      <Ionicons name={cfg.icon} size={13} color={cfg.accentColor} />
                    </View>
                    <Badge label={notice.badgeText} variant={cfg.badgeVariant} />
                    {notice.priority === 'urgent' && (
                      <Badge label="URGENT" variant="danger" />
                    )}
                  </View>
                  <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>
                    {notice.date}
                  </Typography>
                </View>

                {/* Title */}
                <Typography variant="body" weight="bold" numberOfLines={1} style={{ marginTop: 8 }}>
                  {notice.title}
                </Typography>

                {/* Description */}
                <Typography
                  variant="caption"
                  color={colors.textMuted}
                  numberOfLines={2}
                  style={{ marginTop: 4, lineHeight: 17 }}
                >
                  {notice.description}
                </Typography>
              </View>

              {/* Card Footer: Authority & Action Button */}
              <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                <View style={styles.issuedByRow}>
                  <Ionicons
                    name={notice.category === 'app_update' ? 'sparkles-outline' : 'shield-checkmark-outline'}
                    size={13}
                    color={colors.textMuted}
                  />
                  <Typography
                    variant="caption"
                    color={colors.textMuted}
                    numberOfLines={1}
                    style={{ marginLeft: 4, flex: 1, fontSize: 11 }}
                  >
                    {notice.issuedBy}
                  </Typography>
                </View>

                {notice.actionLabel && (
                  <AnimatedButton
                    onPress={() => handleAction(notice)}
                    hapticFeedback="light"
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor:
                          notice.priority === 'urgent'
                            ? colors.danger
                            : notice.category === 'app_update'
                            ? '#8B5CF6'
                            : colors.primary,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        notice.actionType === 'phone'
                          ? 'call'
                          : notice.actionType === 'route'
                          ? 'arrow-forward'
                          : 'open-outline'
                      }
                      size={12}
                      color={colors.white}
                    />
                    <Typography
                      variant="caption"
                      weight="bold"
                      color={colors.white}
                      style={{ marginLeft: 4, fontSize: 11 }}
                    >
                      {notice.actionLabel}
                    </Typography>
                  </AnimatedButton>
                )}
              </View>
            </AnimatedButton>
          );
        }}
      />

      {/* Pagination Dots (Capped to max 5) */}
      {count > 1 && (
        <View style={styles.paginationRow}>
          {displayNotices.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                {
                  backgroundColor: idx === activeIndex ? colors.primary : colors.border,
                  width: idx === activeIndex ? 18 : 6,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 10,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  listContent: {
    gap: CARD_GAP,
  },
  noticeCard: {
    height: FIXED_CARD_HEIGHT,
    borderRadius: 14,
    padding: 12,
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  imageBannerCard: {
    height: FIXED_CARD_HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  issuedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
  },
});
