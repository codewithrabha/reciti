import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { StayIntelSubmissionMeta, User, UserEntitlement } from '@/types';
import {
  getReferralCodeForUser,
  getUserStayIntelSubmission,
  shareReferral,
} from '@/lib/referralService';
import { useCategorySubcategories } from '@/lib/directoryService';
import { RESIDENT_PASS_CONFIG } from '@/lib/residentPassConfig';

interface HousingUnlockModalProps {
  visible: boolean;
  onClose: () => void;
  user: { uid: string; displayName?: string | null; [key: string]: any } | null;
  entitlement: UserEntitlement | null;
  onUnlocked?: () => void;
}

export function HousingUnlockModal({
  visible,
  onClose,
  user,
  entitlement,
  onUnlocked,
}: HousingUnlockModalProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'referrals' | 'stay_intel' | 'fast_track'>('referrals');
  const [copiedCode, setCopiedCode] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<StayIntelSubmissionMeta | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  useEffect(() => {
    if (visible && user?.uid) {
      setLoadingStatus(true);
      getUserStayIntelSubmission(user.uid)
        .then((meta) => {
          if (meta) {
            setSubmissionStatus(meta);
          } else if (user.stayIntelSubmission) {
            setSubmissionStatus(user.stayIntelSubmission);
          }
        })
        .finally(() => setLoadingStatus(false));
    }
  }, [visible, user?.uid, user?.stayIntelSubmission]);

  const referralCode = user ? getReferralCodeForUser(user.uid, user.displayName) : 'RECITI-LOCAL';
  const progressCount = Math.min(entitlement?.referralCount || 0, 3);
  const needed = Math.max(0, 3 - progressCount);

  const handleCopyCode = async () => {
    try {
      await Share.share({
        message: `Use my invite code ${referralCode} on ReCiti to unlock zero-broker rentals & student PGs!`,
      });
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // Ignored
    }
  };

  const handleShareWhatsApp = async () => {
    await shareReferral(referralCode, 'rental_mission');
  };

  const handleGoToContribute = () => {
    onClose();
    router.push('/directories/contribute');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            },
          ]}
        >
          {/* Handle bar */}
          <View style={[styles.handleBar, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Typography variant="h2" style={{ fontSize: 18, marginTop: 4 }}>
                Unlock Direct Owner Contacts
              </Typography>
              <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                Connect directly with landlords. You have 3 options to unlock.
              </Typography>
            </View>

            <AnimatedButton onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </AnimatedButton>
          </View>

          {/* Navigation Tabs */}
          <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
            <AnimatedButton
              onPress={() => setActiveTab('referrals')}
              style={[
                styles.tabItem,
                activeTab === 'referrals' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
            >
              <Typography
                variant="caption"
                weight={activeTab === 'referrals' ? 'bold' : 'semiBold'}
                color={activeTab === 'referrals' ? colors.primary : colors.textMuted}
              >
                1. Invite
              </Typography>
            </AnimatedButton>

            <AnimatedButton
              onPress={() => setActiveTab('stay_intel')}
              style={[
                styles.tabItem,
                activeTab === 'stay_intel' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
            >
              <Typography
                variant="caption"
                weight={activeTab === 'stay_intel' ? 'bold' : 'semiBold'}
                color={activeTab === 'stay_intel' ? colors.primary : colors.textMuted}
              >
                2. Contribute
              </Typography>
            </AnimatedButton>

            <AnimatedButton
              onPress={() => setActiveTab('fast_track')}
              style={[
                styles.tabItem,
                activeTab === 'fast_track' && { borderBottomColor: colors.subscription, borderBottomWidth: 2 },
              ]}
            >
              <Typography
                variant="caption"
                weight={activeTab === 'fast_track' ? 'bold' : 'semiBold'}
                color={activeTab === 'fast_track' ? colors.subscription : colors.textMuted}
              >
                3. Get Pass
              </Typography>
            </AnimatedButton>
          </View>

          {/* Tab 1: 3 Referrals Mission */}
          {activeTab === 'referrals' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
              {/* Step Progress Tracker */}
              <View style={[styles.progressCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={styles.progressHeader}>
                  <Typography variant="caption" weight="bold">
                    Invitation Unlock Progress
                  </Typography>
                  <Typography variant="caption" weight="medium" color={colors.primary}>
                    {progressCount} / 3 Completed
                  </Typography>
                </View>

                {/* Visual Step Dots */}
                <View style={styles.stepsRow}>
                  {[1, 2, 3].map((step) => {
                    const isDone = progressCount >= step;
                    return (
                      <View key={step} style={styles.stepItem}>
                        <View
                          style={[
                            styles.stepCircle,
                            {
                              backgroundColor: isDone ? colors.primary : colors.surface,
                              borderColor: isDone ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <Ionicons
                            name={isDone ? 'checkmark' : 'person-outline'}
                            size={16}
                            color={isDone ? '#FFFFFF' : colors.textMuted}
                          />
                        </View>
                        <Typography
                          variant="caption"
                          weight={isDone ? 'bold' : 'regular'}
                          color={isDone ? colors.text : colors.textMuted}
                          style={{ marginTop: 4, fontSize: 11 }}
                        >
                          {isDone ? `Friend ${step}` : `Invite ${step}`}
                        </Typography>
                      </View>
                    );
                  })}
                </View>

                <Typography
                  variant="caption"
                  color={colors.textMuted}
                  style={{ marginTop: 12, textAlign: 'center', lineHeight: 16 }}
                >
                  {needed === 0
                    ? '🎉 3 friends joined! Your rental pass is unlocked!'
                    : `Invite ${needed} more local friend${needed > 1 ? 's' : ''} to unlock direct phone numbers & exact addresses instantly.`}
                </Typography>
              </View>

              {/* Referral Code Card */}
              <View style={[styles.codeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Typography variant="caption" color={colors.textMuted}>
                    Your Referral Code
                  </Typography>
                  <Typography variant="caption" weight="bold" style={{ letterSpacing: 1, marginTop: 2 }}>
                    {referralCode}
                  </Typography>
                </View>
                <AnimatedButton
                  onPress={handleCopyCode}
                  style={[styles.copyBtn, { backgroundColor: colors.primaryMuted }]}
                >
                  <Ionicons
                    name={copiedCode ? 'checkmark-circle' : 'copy-outline'}
                    size={16}
                    color={colors.primary}
                  />
                  <Typography variant="caption" weight="bold" color={colors.primary} style={{ marginLeft: 4 }}>
                    {copiedCode ? 'Copied!' : 'Copy'}
                  </Typography>
                </AnimatedButton>
              </View>

              {/* WhatsApp Share Button */}
              <AnimatedButton
                onPress={handleShareWhatsApp}
                style={[styles.whatsappBtn, { backgroundColor: '#25D366' }]}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
                <Typography variant="body" weight="bold" color="#FFFFFF" style={{ marginLeft: 8 }}>
                  Share on WhatsApp to Unlock
                </Typography>
              </AnimatedButton>


              <Typography variant="caption" color={colors.textMuted} style={styles.disclaimerText}>
                🛡️ Verified Anti-Abuse: Friends must complete phone/Google sign-in and basic city onboarding to qualify.
              </Typography>
            </ScrollView>
          )}

          {/* Tab 2: Stay Intel / Contribute Screen Navigation & Status */}
          {activeTab === 'stay_intel' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
              {loadingStatus ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 8 }}>
                    Checking submission status...
                  </Typography>
                </View>
              ) : submissionStatus?.status === 'pending_review' ? (
                /* Pending Status Card */
                <View style={[styles.statusCard, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
                  <View style={styles.statusHeaderRow}>
                    <View style={[styles.statusIconWrap, { backgroundColor: colors.surface }]}>
                      <Ionicons name="time" size={24} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Typography variant="body" weight="bold" color={colors.primary}>
                        Verification in Progress
                      </Typography>
                      <Typography variant="caption" color={colors.text} style={{ marginTop: 2 }}>
                        {submissionStatus.propertyName || 'Your Accommodation'}
                      </Typography>
                    </View>
                  </View>

                  <View style={[styles.statusDivider, { backgroundColor: colors.border }]} />

                  <Typography variant="caption" color={colors.textMuted} style={{ lineHeight: 18 }}>
                    Our municipal directory team is verifying landlord contact details and photo authenticity. Once approved, you will automatically unlock direct landlord numbers across the city (+50 Civic Points).
                  </Typography>

                  <View style={styles.statusStepsList}>
                    <View style={styles.statusStepRow}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                      <Typography variant="caption" color={colors.text} style={{ marginLeft: 8 }}>
                        Submission Received
                      </Typography>
                    </View>
                    <View style={styles.statusStepRow}>
                      <Ionicons name="ellipse" size={16} color={colors.primary} />
                      <Typography variant="caption" weight="bold" color={colors.primary} style={{ marginLeft: 8 }}>
                        Admin Verification Underway (12–24h)
                      </Typography>
                    </View>
                    <View style={styles.statusStepRow}>
                      <Ionicons name="ellipse-outline" size={16} color={colors.textMuted} />
                      <Typography variant="caption" color={colors.textMuted} style={{ marginLeft: 8 }}>
                        Unlock & +50 Civic Points
                      </Typography>
                    </View>
                  </View>
                </View>
              ) : submissionStatus?.status === 'approved' ? (
                /* Approved Status Card */
                <View style={[styles.statusCard, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
                  <View style={styles.statusHeaderRow}>
                    <View style={[styles.statusIconWrap, { backgroundColor: colors.surface }]}>
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Typography variant="body" weight="bold" color={colors.primary}>
                        Contribution Approved!
                      </Typography>
                      <Typography variant="caption" color={colors.text} style={{ marginTop: 2 }}>
                        {submissionStatus.propertyName || 'Your Accommodation'}
                      </Typography>
                    </View>
                  </View>

                  <Typography variant="caption" color={colors.text} style={{ marginTop: 10, lineHeight: 18 }}>
                    Thank you! Your stay contribution is active in the city directory. You have full access to all direct landlord contacts.
                  </Typography>

                  <AnimatedButton
                    onPress={onClose}
                    style={[styles.contributeCtaBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
                  >
                    <Typography variant="body" weight="bold" color="#FFFFFF">
                      Explore Housing Listings ➔
                    </Typography>
                  </AnimatedButton>
                </View>
              ) : (
                /* Standard Value Proposition & CTA */
                <View>
                  <View style={[styles.intelIntroCard, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
                    <Ionicons name="shield-checkmark" size={26} color={colors.primary} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Typography variant="label" weight="bold" color={colors.primary}>
                        Contribute & Unlock
                      </Typography>
                      <Typography variant="caption" color={colors.text} style={{ marginTop: 2 }}>
                        Are you renting a PG, hostel, or flat in our city? Share your accommodation to unlock all landlord contacts for free!
                      </Typography>
                    </View>
                  </View>

                  {/* Requirements checklist */}
                  <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.checklistHeading}>
                    WHAT YOU'LL NEED (TAKES ~3 MINS):
                  </Typography>

                  <View style={[styles.checklistCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.checklistItem}>
                      <Ionicons name="location-outline" size={18} color={colors.primary} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Typography variant="caption" weight="bold">1-Tap GPS Location</Typography>
                        <Typography variant="caption" color={colors.textMuted}>
                          Auto-detect the property coordinates or enter street locality.
                        </Typography>
                      </View>
                    </View>

                    <View style={[styles.checklistItem, { marginTop: 12 }]}>
                      <Ionicons name="camera-outline" size={18} color={colors.primary} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Typography variant="caption" weight="bold">Real Accommodation Photos</Typography>
                        <Typography variant="caption" color={colors.textMuted}>
                          At least 1 photo of the room, building, or entrance (mandatory).
                        </Typography>
                      </View>
                    </View>

                    <View style={[styles.checklistItem, { marginTop: 12 }]}>
                      <Ionicons name="call-outline" size={18} color={colors.primary} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Typography variant="caption" weight="bold">Direct Landlord Mobile Number</Typography>
                        <Typography variant="caption" color={colors.textMuted}>
                          Owner contact number to maintain our 100% zero-broker guarantee.
                        </Typography>
                      </View>
                    </View>

                    <View style={[styles.checklistItem, { marginTop: 12 }]}>
                      <Ionicons name="shield-outline" size={18} color={colors.primary} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Typography variant="caption" weight="bold">Quick Admin Verification</Typography>
                        <Typography variant="caption" color={colors.textMuted}>
                          Verified within 1/2 - 1Hr by municipal admin to unlock contacts and earn +50 Civic Points.
                        </Typography>
                      </View>
                    </View>
                  </View>

                  {/* High-impact CTA Button to Dedicated Screen */}
                  <AnimatedButton
                    onPress={handleGoToContribute}
                    style={[styles.contributeCtaBtn, { backgroundColor: colors.primary }]}
                  >
                    <Typography variant="body" weight="bold" color="#FFFFFF" style={{ marginLeft: 8 }}>
                      Contribute
                    </Typography>
                  </AnimatedButton>
                </View>
              )}
            </ScrollView>
          )}

          {/* Tab 3: Fast Track Resident Pass */}
          {activeTab === 'fast_track' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
              <View style={[styles.passCard, { backgroundColor: colors.surface, borderColor: colors.subscriptionBorder }]}>
                <View style={styles.passHeader}>
                  <View style={[styles.crownIcon, { backgroundColor: colors.subscriptionMuted }]}>
                    <Ionicons name="ribbon" size={22} color={colors.subscription} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Typography variant="body" weight="bold">ReCiti Resident Pass</Typography>
                    <Typography variant="caption" color={colors.subscription} weight="bold">
                      {RESIDENT_PASS_CONFIG.priceTag} ({RESIDENT_PASS_CONFIG.monthlyEquivalent})
                    </Typography>
                  </View>
                </View>

                <View style={styles.benefitsList}>
                  {RESIDENT_PASS_CONFIG.activeBenefits.map((benefit) => (
                    <View key={benefit.id} style={styles.benefitRow}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.subscription} />
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Typography variant="caption" weight="bold" color={colors.text}>
                          {benefit.title}
                        </Typography>
                        <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 11, lineHeight: 15, marginTop: 1 }}>
                          {benefit.description}
                        </Typography>
                      </View>
                    </View>
                  ))}

                </View>

                <AnimatedButton
                  disabled={true}
                  style={[
                    styles.subscribeBtn,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      borderWidth: 1,
                      opacity: 0.75,
                    },
                  ]}
                >
                  <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
                  <Typography variant="body" weight="bold" color={colors.textMuted} style={{ marginLeft: 6 }}>
                    Subscription Coming Soon
                  </Typography>
                </AnimatedButton>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: '88%',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  zeroBrokerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  closeBtn: {
    padding: 6,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabContent: {
    padding: 20,
    gap: 14,
  },
  progressCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  progressHeader: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  stepsRow: {
    marginBlock: 7,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  disclaimerText: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
  },
  intelIntroCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  checklistHeading: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 8,
  },
  checklistCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  contributeCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 18,
    marginBottom: 10,
  },
  statusCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDivider: {
    height: 1,
    marginVertical: 12,
  },
  statusStepsList: {
    marginTop: 12,
    gap: 8,
  },
  statusStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 16,
  },
  passHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crownIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitsList: {
    gap: 10,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  subscribeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },

});
