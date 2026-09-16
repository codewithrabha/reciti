import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CityNotice } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2;
const FIXED_CARD_HEIGHT = 192;
const AUTO_SLIDE_INTERVAL = 5500; // 5.5 seconds

interface NoticeBoardCarouselProps {
  notices: CityNotice[];
  cityName?: string | null;
}

export function NoticeBoardCarousel({ notices, cityName }: NoticeBoardCarouselProps) {
  const { colors, spacing, radii } = useTheme();
  const router = useRouter();

  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedNotice, setSelectedNotice] = useState<CityNotice | null>(null);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  const flatListRef = useRef<FlatList<CityNotice>>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = notices.length;

  // Auto-slide effect
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (count <= 1 || isUserInteracting) return;

    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % count;
        flatListRef.current?.scrollToOffset({
          offset: next * (CARD_WIDTH + 12),
          animated: true,
        });
        return next;
      });
    }, AUTO_SLIDE_INTERVAL);
  }, [count, isUserInteracting]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, [startTimer, stopTimer, count]);

  // Handle user scroll gestures
  const handleScrollBeginDrag = () => {
    setIsUserInteracting(true);
    stopTimer();
  };

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + 12));
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
    } else {
      setSelectedNotice(notice);
    }
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
      {/* Notice Board Section Label */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.pulseDot, { backgroundColor: colors.danger }]} />
          <Typography variant="caption" weight="bold" color={colors.text} style={{ letterSpacing: 0.6 }}>
            {cityName ? `${cityName} Broadcasts` : 'Official Broadcasts'}
          </Typography>
        </View>
        <Typography variant="caption" color={colors.textMuted}>
          {activeIndex + 1}/{count}
        </Typography>
      </View>

      {/* Snap-paging Carousel */}
      <FlatList
        ref={flatListRef}
        data={notices}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 12}
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        renderItem={({ item: notice }) => {
          // ── Case A: Full Image Banner Card (Image Only) ──────────────────
          if (notice.displayType === 'image_banner' && notice.imageUrl) {
            return (
              <AnimatedButton
                onPress={() => handleAction(notice)}
                scaleTo={0.99}
                style={[
                  styles.imageBannerCard,
                  { width: CARD_WIDTH, borderColor: colors.border },
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

          // ── Case B: Standard & App Feature Update Card ─────────────────────
          const cfg = getCategoryConfig(notice);

          return (
            <AnimatedButton
              onPress={() => setSelectedNotice(notice)}
              scaleTo={0.99}
              style={[
                styles.noticeCard,
                {
                  width: CARD_WIDTH,
                  backgroundColor: colors.surface,
                  borderColor:
                    notice.priority === 'urgent'
                      ? colors.danger
                      : notice.category === 'app_update'
                      ? '#8B5CF6'
                      : colors.border,
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

      {/* Pagination Dots */}
      {count > 1 && (
        <View style={styles.paginationRow}>
          {notices.map((_, idx) => (
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

      {/* Notice Detail Modal */}
      <Modal
        visible={!!selectedNotice}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedNotice(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {selectedNotice && (
              <>
                {/* Optional Top Poster Image */}
                {selectedNotice.imageUrl && (
                  <View style={styles.modalImageWrapper}>
                    <Image
                      source={{ uri: selectedNotice.imageUrl }}
                      style={styles.modalImage}
                      contentFit="cover"
                      transition={200}
                    />
                  </View>
                )}

                <View style={styles.modalHeader}>
                  <Badge
                    label={selectedNotice.badgeText}
                    variant={getCategoryConfig(selectedNotice).badgeVariant}
                  />
                  <AnimatedButton onPress={() => setSelectedNotice(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={20} color={colors.textMuted} />
                  </AnimatedButton>
                </View>

                <Typography variant="h2" style={{ marginTop: 12 }}>
                  {selectedNotice.title}
                </Typography>

                <Typography variant="caption" color={colors.primary} style={{ marginTop: 4 }}>
                  Issued by {selectedNotice.issuedBy} • {selectedNotice.date}
                </Typography>

                <Typography variant="body" color={colors.text} style={{ marginTop: 14, lineHeight: 22 }}>
                  {selectedNotice.description}
                </Typography>

                <View style={[styles.modalActions, { marginTop: 20 }]}>
                  {selectedNotice.actionLabel && (
                    <AnimatedButton
                      onPress={() => {
                        const notice = selectedNotice;
                        setSelectedNotice(null);
                        handleAction(notice);
                      }}
                      style={[
                        styles.modalPrimaryBtn,
                        {
                          backgroundColor:
                            selectedNotice.priority === 'urgent'
                              ? colors.danger
                              : selectedNotice.category === 'app_update'
                              ? '#8B5CF6'
                              : colors.primary,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          selectedNotice.actionType === 'phone'
                            ? 'call'
                            : selectedNotice.actionType === 'route'
                            ? 'arrow-forward'
                            : 'open-outline'
                        }
                        size={16}
                        color={colors.white}
                      />
                      <Typography
                        variant="body"
                        weight="bold"
                        color={colors.white}
                        style={{ marginLeft: 6 }}
                      >
                        {selectedNotice.actionLabel}
                      </Typography>
                    </AnimatedButton>
                  )}

                  <AnimatedButton
                    onPress={() => setSelectedNotice(null)}
                    style={[styles.modalSecondaryBtn, { borderColor: colors.border }]}
                  >
                    <Typography variant="body" weight="semiBold" color={colors.text}>
                      Close
                    </Typography>
                  </AnimatedButton>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    gap: 12,
  },
  noticeCard: {
    height: FIXED_CARD_HEIGHT,
    borderRadius: 14,
    borderWidth: 1.2,
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
    borderWidth: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  modalImageWrapper: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalSecondaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
