import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BusinessDirectoryItem, ListingClaim, UserEntitlement } from '@/types';
import {
  getCategoryLabel,
  getDirectoryItemById,
  getSubcategoryLabel,
  getUserListingClaim,
  submitListingClaim,
} from '@/lib/directoryService';
import {
  subscribeUserEntitlement,
  createDefaultEntitlement,
} from '@/lib/referralService';
import { CategorySectionRegistry } from '@/components/directories/templates/CategorySectionRegistry';
import { shareDirectory } from '@/lib/shareService';
import { useUser, useUserDoc } from '@/store/authStore';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { StateView } from '@/components/ui/StateView';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { ImageLightboxModal } from '@/components/ui/ImageLightboxModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 270;

export default function DirectoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radii } = useTheme();

  const user = useUser();
  const userDoc = useUserDoc();

  const [business, setBusiness] = useState<BusinessDirectoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [existingClaim, setExistingClaim] = useState<ListingClaim | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [entitlement, setEntitlement] = useState<UserEntitlement>(createDefaultEntitlement(user?.uid || ''));

  // Gallery & Lightbox states
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const gallery = useMemo(() => {
    if (!business) return [];
    const list: string[] = [];
    if (business.imageUrl && business.imageUrl.trim()) {
      list.push(business.imageUrl.trim());
    }
    if (business.imageUrls && Array.isArray(business.imageUrls)) {
      business.imageUrls.forEach((u) => {
        if (u && typeof u === 'string' && u.trim() && !list.includes(u.trim())) {
          list.push(u.trim());
        }
      });
    }
    return list;
  }, [business]);

  useEffect(() => {
    setActiveImageIdx(0);
  }, [business?.id]);

  const safeIdx = Math.min(activeImageIdx, Math.max(0, gallery.length - 1));
  const currentImageUrl = gallery[safeIdx] || business?.imageUrl || '';

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeUserEntitlement(user.uid, (ent) => {
      setEntitlement(ent);
    });
    return () => unsub();
  }, [user?.uid]);

  // Claim Modal state
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [claimantName, setClaimantName] = useState('');
  const [claimantPhone, setClaimantPhone] = useState('');
  const [claimantRole, setClaimantRole] = useState('');
  const [claimNotes, setClaimNotes] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const item = await getDirectoryItemById(id);
        setBusiness(item);

        if (user && item) {
          const claim = await getUserListingClaim(item.id, user.uid);
          setExistingClaim(claim);
        }
      } catch (err) {
        console.error('[DirectoryDetail] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user]);

  const handleShare = async () => {
    if (!business) return;
    await shareDirectory(business);
  };

  const handleOpenClaimModal = () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in with your citizen account to claim and manage this business listing.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth/login') },
        ]
      );
      return;
    }
    setClaimantName(userDoc?.displayName ?? user.displayName ?? '');
    setClaimModalVisible(true);
  };

  const handleSubmitClaim = async () => {
    if (!business || !user) return;
    if (!claimantName.trim()) {
      Alert.alert('Required Field', 'Please enter your name.');
      return;
    }
    if (!claimantPhone.trim()) {
      Alert.alert('Required Field', 'Please provide a valid contact phone number.');
      return;
    }

    setSubmittingClaim(true);
    const notesSummary = [
      claimantRole.trim() ? `Role: ${claimantRole.trim()}` : null,
      claimNotes.trim() ? `Notes: ${claimNotes.trim()}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    const res = await submitListingClaim({
      listingId: business.id,
      listingName: business.name,
      claimantUid: user.uid,
      claimantName: claimantName.trim(),
      claimantEmail: user.email ?? undefined,
      claimantPhone: claimantPhone.trim(),
      notes: notesSummary,
    });

    setSubmittingClaim(false);

    if (res.success) {
      setClaimModalVisible(false);
      setExistingClaim({
        claimId: res.claimId ?? 'new',
        listingId: business.id,
        listingName: business.name,
        claimantUid: user.uid,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      Alert.alert(
        'Claim Submitted',
        'Your verification request has been received! Our municipal directory team will verify ownership within 24-48 hours.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Submission Error', res.error ?? 'Could not submit claim. Please try again.');
    }
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

  const isOwner = Boolean(user && business.ownerId && user.uid === business.ownerId);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sticky Top Header */}
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 8 },
          scrolled && {
            backgroundColor: colors.background,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          },
        ]}
      >
        <AnimatedButton
          onPress={() => router.back()}
          hapticFeedback="light"
          style={[styles.circleButton, { backgroundColor: scrolled ? colors.surface : colors.surface + 'EE' }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </AnimatedButton>
        <View style={styles.topBarRight}>
          <AnimatedButton
            onPress={handleShare}
            hapticFeedback="light"
            style={[styles.circleButton, { backgroundColor: scrolled ? colors.surface : colors.surface + 'EE' }]}
          >
            <Ionicons name="share-social-outline" size={20} color={colors.text} />
          </AnimatedButton>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        scrollEventThrottle={16}
        overScrollMode="never"
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          if (y > 24 !== scrolled) setScrolled(y > 24);
        }}
      >
        {/* Banner with Interactive Lightbox & Thumbnails */}
        <View style={styles.bannerContainer}>
          <Pressable
            onPress={() => setLightboxOpen(true)}
            style={styles.bannerImagePressable}
            accessibilityRole="imagebutton"
            accessibilityLabel="View full screen photos"
          >
            <Image
              source={{ uri: currentImageUrl }}
              style={styles.bannerImage}
              contentFit="cover"
              transition={300}
            />

            {/* Gradient shadow for contrast */}
            <LinearGradient
              colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.75)']}
              locations={[0, 0.45, 1]}
              style={styles.bannerGradient}
              pointerEvents="none"
            />
          </Pressable>

          {/* Bottom Thumbnails Strip (if multiple photos exist) */}
          {gallery.length > 1 && (
            <View style={styles.thumbnailsContainer}>
              <View style={styles.thumbnailsContent}>
                {gallery.slice(0, 3).map((imgUri, index) => {
                  const isActive = index === safeIdx;
                  return (
                    <AnimatedButton
                      key={`thumb-${imgUri}-${index}`}
                      onPress={() => {
                        setActiveImageIdx(index);
                        Haptics.selectionAsync().catch(() => {});
                      }}
                      hapticFeedback="none"
                      style={[
                        styles.thumbnailItem,
                        isActive && [
                          styles.thumbnailActive,
                          { borderColor: colors.primary },
                        ],
                      ]}
                    >
                      <Image
                        source={{ uri: imgUri }}
                        style={styles.thumbnailImage}
                        contentFit="cover"
                        transition={150}
                      />
                      {isActive && <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />}
                    </AnimatedButton>
                  );
                })}

                {/* +Count box if there are more than 3 photos */}
                {gallery.length > 3 && (
                  <AnimatedButton
                    onPress={() => {
                      if (safeIdx < 3) {
                        setActiveImageIdx(3);
                      }
                      setLightboxOpen(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    }}
                    hapticFeedback="none"
                    style={[
                      styles.thumbnailItem,
                      styles.moreThumbBox,
                      safeIdx >= 3 && [
                        styles.thumbnailActive,
                        { borderColor: colors.primary },
                      ],
                    ]}
                  >
                    {gallery[3] && (
                      <Image
                        source={{ uri: gallery[3] }}
                        style={[StyleSheet.absoluteFillObject, { opacity: 0.35 }]}
                        contentFit="cover"
                      />
                    )}
                    <View style={styles.moreThumbOverlay}>
                      <Typography variant="body" weight="bold" color="#FFFFFF" style={styles.moreThumbText}>
                        +{gallery.length - 3}
                      </Typography>
                    </View>
                    {safeIdx >= 3 && <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />}
                  </AnimatedButton>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Content Body */}
        <Animated.View entering={FadeIn.duration(250)} style={[styles.body, { paddingHorizontal: spacing.md }]}>
          {/* Badges & Meta */}
          <View style={styles.metaRow}>
            <Badge
              label={getCategoryLabel(business.category).toUpperCase()}
              variant="default"
            />
            {Boolean(business.subcategory) && (
              <Badge
                label={getSubcategoryLabel(business.subcategory)?.toUpperCase() ?? ''}
                variant="primary"
              />
            )}
            {business.isClaimed && (
              <Badge
                label="VERIFIED OWNER MANAGED"
                variant="primary"
              />
            )}
            {business.isSponsored && (
              <Badge
                label="FEATURED"
                variant="warning"
              />
            )}
            {isOwner && (
              <Badge
                label="YOU OWN THIS"
                variant="primary"
              />
            )}
          </View>

          {/* Business Title */}
          <Typography variant="h1" style={{ marginTop: spacing.sm }}>
            {business.name}
          </Typography>

          {/* Rating & Reviews */}
          {Boolean(business.rating && business.rating > 0 && business.reviewCount && business.reviewCount > 0) && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Typography variant="body" weight="bold" style={{ marginLeft: 4 }}>
                {business.rating!.toFixed(1)}
              </Typography>
              <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 6 }}>
                ({business.reviewCount} {business.reviewCount === 1 ? 'review' : 'reviews'})
              </Typography>
            </View>
          )}

          {/* Category-Specific Section Slot */}
          <CategorySectionRegistry
            business={business}
            user={user}
            entitlement={entitlement}
            onShare={handleShare}
          />

          {/* Ownership & Claim Section */}
          {!business.isClaimed && (
            <View
              style={[
                styles.claimCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.claimHeaderRow}>
                <View style={[styles.claimIconWrap, { backgroundColor: colors.primaryMuted }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Typography variant="body" weight="bold">
                    {existingClaim ? 'Claim Submitted (Under Review)' : 'Own or Manage this Place?'}
                  </Typography>
                  <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                    {existingClaim
                      ? 'Your ownership verification request is in review by the municipal directory team.'
                      : 'Claim this listing to keep hours, services, and contact info up to date for citizens.'}
                  </Typography>
                </View>
              </View>

              {!existingClaim && (
                <AnimatedButton
                  onPress={handleOpenClaimModal}
                  style={[styles.claimActionBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="key-outline" size={16} color="#FFFFFF" />
                  <Typography variant="caption" weight="bold" color="#FFFFFF" style={{ marginLeft: 6 }}>
                    Claim This Listing
                  </Typography>
                </AnimatedButton>
              )}
            </View>
          )}

          {/* About Section */}
          <Typography variant="h2" style={{ marginTop: spacing.lg, marginBottom: spacing.xs }}>
            About
          </Typography>
          <Typography variant="body" color={colors.text} style={{ lineHeight: 22 }}>
            {business.description}
          </Typography>

          {/* Community Ratings & Reviews Section */}
          <ReviewsSection
            targetId={business.id}
            targetType="directory"
            targetTitle={business.name}
            initialRating={business.rating}
            initialReviewCount={business.reviewCount}
            onRatingUpdated={(newRating, newCount) => {
              setBusiness((prev) => (prev ? { ...prev, rating: newRating, reviewCount: newCount } : null));
            }}
          />
        </Animated.View>

      </ScrollView>

      {/* Claim Modal */}
      <Modal
        visible={claimModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setClaimModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setClaimModalVisible(false)}
          />
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.surface, paddingBottom: insets.bottom + 20 },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Typography variant="h2">Claim Listing</Typography>
                <Typography variant="caption" color={colors.textMuted}>
                  {business.name}
                </Typography>
              </View>
              <Pressable
                onPress={() => setClaimModalVisible(false)}
                hitSlop={8}
                style={[styles.modalCloseBtn, { backgroundColor: colors.background }]}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 16 }}
            >
              {/* Claimant Full Name */}
              <Typography variant="caption" weight="semiBold" color={colors.textMuted}>
                YOUR FULL NAME *
              </Typography>
              <TextInput
                value={claimantName}
                onChangeText={setClaimantName}
                placeholder="e.g., Rajesh Sharma"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              />

              {/* Claimant Contact Phone */}
              <Typography
                variant="caption"
                weight="semiBold"
                color={colors.textMuted}
                style={{ marginTop: 12 }}
              >
                PHONE NUMBER *
              </Typography>
              <TextInput
                value={claimantPhone}
                onChangeText={setClaimantPhone}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              />

              {/* Role */}
              <Typography
                variant="caption"
                weight="semiBold"
                color={colors.textMuted}
                style={{ marginTop: 12 }}
              >
                YOUR ROLE OR TITLE
              </Typography>
              <TextInput
                value={claimantRole}
                onChangeText={setClaimantRole}
                placeholder="e.g., Proprietor / Store Manager / Director"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              />

              {/* Notes / Verification details */}
              <Typography
                variant="caption"
                weight="semiBold"
                color={colors.textMuted}
                style={{ marginTop: 12 }}
              >
                VERIFICATION NOTES
              </Typography>
              <TextInput
                value={claimNotes}
                onChangeText={setClaimNotes}
                placeholder="Any links, license numbers, or details to expedite verification..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              />

              <AnimatedButton
                onPress={handleSubmitClaim}
                disabled={submittingClaim}
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.primary, opacity: submittingClaim ? 0.7 : 1 },
                ]}
              >
                {submittingClaim ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Typography variant="body" weight="bold" color="#FFFFFF">
                    Submit Verification Request
                  </Typography>
                )}
              </AnimatedButton>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Image Lightbox Modal */}
      <ImageLightboxModal
        visible={lightboxOpen}
        images={gallery}
        initialIndex={safeIdx}
        onClose={() => setLightboxOpen(false)}
      />
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
    backgroundColor: '#0a0a0a',
  },
  bannerImagePressable: {
    width: '100%',
    height: '100%',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  lightboxBadge: {
    position: 'absolute',
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 5,
  },
  thumbnailsContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  thumbnailsContent: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 8,
    alignItems: 'center',
  },
  moreThumbBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreThumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreThumbText: {
    fontSize: 15,
    letterSpacing: 0.5,
  },
  thumbnailItem: {
    width: 54,
    height: 54,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  thumbnailActive: {
    borderWidth: 1.5,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -5,
    left: 0,
    right: 0,
    height: 3,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
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
  claimCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  claimHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  claimIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimActionBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#8883',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginTop: 6,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: 20,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
