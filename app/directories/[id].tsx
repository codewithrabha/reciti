import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BusinessDirectoryItem } from '@/types';
import { getDirectoryItemById } from '@/lib/directoryService';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { StateView } from '@/components/ui/StateView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 260;

export default function DirectoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radii } = useTheme();

  const [business, setBusiness] = useState<BusinessDirectoryItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const item = await getDirectoryItemById(id);
        setBusiness(item);
      } catch (err) {
        console.error('[DirectoryDetail] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleShare = async () => {
    if (!business) return;
    try {
      await Share.share({
        title: business.name,
        message: `Check out ${business.name} on ReCiti: ${business.description}`,
      });
    } catch {
      // dismissed
    }
  };

  const handleCall = () => {
    if (!business?.phone) return;
    Linking.openURL(`tel:${business.phone}`);
  };

  const handleDirections = () => {
    if (!business) return;
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${business.latitude},${business.longitude}`;
    const label = encodeURIComponent(business.name);
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latLng}`,
    });
    if (url) Linking.openURL(url);
  };

  const handleWebsite = () => {
    if (!business?.website) return;
    Linking.openURL(business.website);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <StateView
          icon="business"
          tone="error"
          title="Listing Not Found"
          message="This business listing could not be found or has been removed."
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </View>
    );
  }


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Banner with gradient overlay & top buttons */}
        <View style={styles.bannerContainer}>
          <Image
            source={{ uri: business.imageUrl }}
            style={styles.bannerImage}
            contentFit="cover"
            transition={300}
          />
          {/* Top Bar Actions */}
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <AnimatedButton
              onPress={() => router.back()}
              style={[styles.circleButton, { backgroundColor: colors.surface + 'EE' }]}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </AnimatedButton>
            <View style={styles.topBarRight}>
              <AnimatedButton
                onPress={handleShare}
                style={[styles.circleButton, { backgroundColor: colors.surface + 'EE' }]}
              >
                <Ionicons name="share-outline" size={20} color={colors.text} />
              </AnimatedButton>
            </View>
          </View>
        </View>

        {/* Content Body */}
        <Animated.View entering={FadeIn.duration(250)} style={[styles.body, { paddingHorizontal: spacing.md }]}>
          {/* Badges & Meta */}
          <View style={styles.metaRow}>
            <Badge
              label={business.category.replace('_', ' ').toUpperCase()}
              variant="default"
            />
            {business.isVerified && (
              <Badge
                label="VERIFIED CITIZEN PARTNER"
                variant="primary"
              />
            )}
            {business.isSponsored && (
              <Badge
                label="FEATURED"
                variant="warning"
              />
            )}
          </View>

          {/* Business Title */}
          <Typography variant="h1" style={{ marginTop: spacing.sm }}>
            {business.name}
          </Typography>

          {/* Rating & Reviews */}
          {business.rating && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Typography variant="body" weight="bold" style={{ marginLeft: 4 }}>
                {business.rating.toFixed(1)}
              </Typography>
              <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 6 }}>
                ({business.reviewCount ?? 0} reviews)
              </Typography>
            </View>
          )}

          {/* Address & Hours */}
          <View style={[styles.infoBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={18} color={colors.primary} />
              <Typography variant="body" color={colors.text} style={{ flex: 1, marginLeft: spacing.sm }}>
                {business.address}{business.city ? `, ${business.city}` : ''}
              </Typography>
            </View>
            {business.openingHours && (
              <View style={[styles.infoRow, { marginTop: spacing.sm }]}>
                <Ionicons name="time" size={18} color={colors.textMuted} />
                <Typography variant="body" color={colors.textMuted} style={{ flex: 1, marginLeft: spacing.sm }}>
                  {business.openingHours}
                </Typography>
              </View>
            )}
          </View>


          {/* Quick Action Buttons */}
          <View style={styles.actionsGrid}>
            {business.phone && (
              <AnimatedButton
                onPress={handleCall}
                style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Ionicons name="call-outline" size={20} color={colors.primary} />
                <Typography variant="caption" weight="semiBold" style={{ marginTop: 4 }}>
                  Call
                </Typography>
              </AnimatedButton>
            )}
            <AnimatedButton
              onPress={handleDirections}
              style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="navigate-outline" size={20} color={colors.primary} />
              <Typography variant="caption" weight="semiBold" style={{ marginTop: 4 }}>
                Directions
              </Typography>
            </AnimatedButton>
            {business.website && (
              <AnimatedButton
                onPress={handleWebsite}
                style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Ionicons name="globe-outline" size={20} color={colors.primary} />
                <Typography variant="caption" weight="semiBold" style={{ marginTop: 4 }}>
                  Website
                </Typography>
              </AnimatedButton>
            )}
          </View>

          {/* About Section */}
          <Typography variant="h2" style={{ marginTop: spacing.lg, marginBottom: spacing.xs }}>
            About
          </Typography>
          <Typography variant="body" color={colors.text} style={{ lineHeight: 22 }}>
            {business.description}
          </Typography>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bannerContainer: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  topBarRight: { flexDirection: 'row', gap: 10 },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  body: {
    paddingTop: 16,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  infoBlock: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
});
