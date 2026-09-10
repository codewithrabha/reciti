import React, { useEffect, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BusinessDirectoryItem, ListingClaim } from '@/types';
import {
  getDirectoryItemById,
  getUserListingClaim,
  submitListingClaim,
} from '@/lib/directoryService';
import { useUser, useUserDoc } from '@/store/authStore';
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

  const user = useUser();
  const userDoc = useUserDoc();

  const [business, setBusiness] = useState<BusinessDirectoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [existingClaim, setExistingClaim] = useState<ListingClaim | null>(null);

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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Banner with top buttons */}
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
