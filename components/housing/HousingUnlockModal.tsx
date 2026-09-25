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
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { User, UserEntitlement } from '@/types';
import {
  getReferralCodeForUser,
  shareReferral,
  submitStayIntel,
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

  const [activeTab, setActiveTab] = useState<'referrals' | 'stay_intel' | 'fast_track'>('referrals');
  const [submittingIntel, setSubmittingIntel] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const housingSubcategories = useCategorySubcategories('housing_rentals');

  // Stay Intel form states
  const [stayType, setStayType] = useState<string>(() => housingSubcategories[0]?.key || 'pg');

  useEffect(() => {
    if (housingSubcategories.length > 0 && !housingSubcategories.some((s) => s.key === stayType)) {
      setStayType(housingSubcategories[0].key);
    }
  }, [housingSubcategories, stayType]);
  const [propertyName, setPropertyName] = useState('');
  const [locality, setLocality] = useState('');
  const [rent, setRent] = useState('');
  const [foodIncluded, setFoodIncluded] = useState(false);
  const [curfewTime, setCurfewTime] = useState('10:00 PM');
  const [vacatingSoon, setVacatingSoon] = useState(true);
  const [moveOutDate, setMoveOutDate] = useState('End of this month');
  const [vacatingNote, setVacatingNote] = useState('');
  const [landlordName, setLandlordName] = useState('');
  const [landlordPhone, setLandlordPhone] = useState('');

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


  const handleSubmitStayIntel = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to submit your stay details.');
      return;
    }
    if (!locality.trim()) {
      Alert.alert('Required', 'Please enter your locality or neighborhood area.');
      return;
    }
    if (!rent.trim() || isNaN(Number(rent))) {
      Alert.alert('Required', 'Please enter a valid monthly rent amount.');
      return;
    }
    if (!landlordPhone.trim() || landlordPhone.trim().length < 10) {
      Alert.alert('Required', 'Please provide a valid 10-digit landlord/owner contact number.');
      return;
    }

    setSubmittingIntel(true);
    try {
      const res = await submitStayIntel(user, {
        propertyType: stayType,
        propertyName: propertyName.trim() || undefined,
        locality: locality.trim(),
        monthlyRent: Number(rent),
        foodIncluded,
        curfewTime: curfewTime.trim() || undefined,
        vacatingSoon,
        moveOutDate: vacatingSoon ? moveOutDate.trim() : undefined,
        vacatingNote: vacatingNote.trim() || undefined,
        landlordName: landlordName.trim() || 'House Owner',
        landlordPhone: landlordPhone.trim(),
      });

      if (res.success) {
        Alert.alert(
          '🎉 Stay Intel Submitted!',
          'Thank you for contributing to our zero-broker civic community! All landlord contacts are now fully unlocked (+50 Civic Points awarded).',
          [{ text: 'Explore Now', onPress: () => { onClose(); onUnlocked?.(); } }]
        );
      } else {
        Alert.alert('Error', res.error || 'Failed to submit stay details.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Something went wrong.');
    } finally {
      setSubmittingIntel(false);
    }
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

          {/* Tab 2: Stay Intel Form */}
          {activeTab === 'stay_intel' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
              <View style={[styles.intelIntroCard, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
                
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Typography variant="body" weight="bold" color={colors.primary}>
                    Share & Instant Unlock
                  </Typography>
                  <Typography variant="caption" color={colors.text} style={{ marginTop: 2 }}>
                    Already renting in a PG or flat? Share your stay details to unlock all housing immediately!
                  </Typography>
                </View>
              </View>

              {/* Property Type */}
              <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.formSectionTitle}>
                1. PROPERTY TYPE
              </Typography>
              <View style={styles.chipsWrap}>
                {housingSubcategories.map((item) => {
                  const isSelected = stayType === item.key;
                  return (
                    <AnimatedButton
                      key={item.key}
                      onPress={() => setStayType(item.key)}
                      style={[
                        styles.choiceChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.background,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Typography
                        variant="caption"
                        weight={isSelected ? 'bold' : 'regular'}
                        color={isSelected ? '#FFFFFF' : colors.text}
                      >
                        {item.label}
                      </Typography>
                    </AnimatedButton>
                  );
                })}
              </View>

              {/* Locality & Rent */}
              <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.formSectionTitle}>
                2. LOCATION & RENT
              </Typography>
              <View style={styles.inputGrid}>
                <TextInput
                  placeholder="Locality (e.g. College Road, Ward 3)"
                  placeholderTextColor={colors.textMuted}
                  value={locality}
                  onChangeText={setLocality}
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                />
                <TextInput
                  placeholder="Monthly Rent (e.g. 4500)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={rent}
                  onChangeText={setRent}
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                />
              </View>

              {/* Vacancy Alert */}
              <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.formSectionTitle}>
                3. VACANCY STATUS
              </Typography>
              <View style={styles.vacancyChoiceRow}>
                <AnimatedButton
                  onPress={() => setVacatingSoon(true)}
                  style={[
                    styles.vacancyBtn,
                    {
                      backgroundColor: vacatingSoon ? colors.primary + '18' : colors.background,
                      borderColor: vacatingSoon ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={vacatingSoon ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={vacatingSoon ? colors.primary : colors.textMuted}
                  />
                  <Typography variant="caption" weight={vacatingSoon ? 'bold' : 'regular'} style={{ marginLeft: 6 }}>
                    Vacating Soon (Room Opening)
                  </Typography>
                </AnimatedButton>

                <AnimatedButton
                  onPress={() => setVacatingSoon(false)}
                  style={[
                    styles.vacancyBtn,
                    {
                      backgroundColor: !vacatingSoon ? colors.primary + '18' : colors.background,
                      borderColor: !vacatingSoon ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={!vacatingSoon ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={!vacatingSoon ? colors.primary : colors.textMuted}
                  />
                  <Typography variant="caption" weight={!vacatingSoon ? 'bold' : 'regular'} style={{ marginLeft: 6 }}>
                    Fully Occupied (For now)
                  </Typography>
                </AnimatedButton>
              </View>

              {/* Landlord Contact */}
              <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.formSectionTitle}>
                4. DIRECT LANDLORD CONTACT
              </Typography>
              <View style={styles.inputGrid}>
                <TextInput
                  placeholder="Landlord Name (e.g. Barman Uncle)"
                  placeholderTextColor={colors.textMuted}
                  value={landlordName}
                  onChangeText={setLandlordName}
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                />
                <TextInput
                  placeholder="Owner 10-Digit Mobile Number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={landlordPhone}
                  onChangeText={setLandlordPhone}
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                />
              </View>

              {/* Submit Stay Intel Button */}
              <AnimatedButton
                onPress={handleSubmitStayIntel}
                disabled={submittingIntel}
                style={[styles.submitIntelBtn, { backgroundColor: colors.primary, opacity: submittingIntel ? 0.7 : 1 }]}
              >
                {submittingIntel ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="rocket-outline" size={18} color="#FFFFFF" />
                    <Typography variant="body" weight="bold" color="#FFFFFF" style={{ marginLeft: 8 }}>
                      Submit & Unlock
                    </Typography>
                  </>
                )}
              </AnimatedButton>
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
  formSectionTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 6,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 50,
    borderWidth: 1,
  },
  inputGrid: {
    gap: 8,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  vacancyChoiceRow: {
    gap: 8,
  },
  vacancyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  submitIntelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 20,
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
