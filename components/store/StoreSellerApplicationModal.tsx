import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useUser, useUserDoc } from '@/hooks/useAuth';
import {
  submitCivicApplication,
  withdrawCivicApplication,
  useUserApplication,
} from '@/lib/applicationService';
import { StoreSellerPayload } from '@/types';

interface StoreSellerApplicationModalProps {
  visible: boolean;
  cityName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORIES = [
  { key: 'artisan', label: 'Artisan & Handcrafted', icon: 'color-palette-outline' },
  { key: 'farm_fresh', label: 'Farm Fresh & Organic', icon: 'nutrition-outline' },
  { key: 'eco_living', label: 'Eco & Zero-Waste', icon: 'leaf-outline' },
  { key: 'gourmet', label: 'Gourmet & Delights', icon: 'cafe-outline' },
  { key: 'books', label: 'Books & Indie Press', icon: 'book-outline' },
  { key: 'home_living', label: 'Home & Living', icon: 'home-outline' },
  { key: 'other', label: 'Other Specialty', icon: 'cube-outline' },
];

export function StoreSellerApplicationModal({
  visible,
  cityName,
  onClose,
  onSuccess,
}: StoreSellerApplicationModalProps) {
  const { colors, spacing } = useTheme();
  const user = useUser();
  const userDoc = useUserDoc();

  const { application, loading: appLoading } = useUserApplication<StoreSellerPayload>(
    'store_seller',
    user?.uid
  );

  // Form State
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].key);
  const [locality, setLocality] = useState('');
  const [description, setDescription] = useState('');
  const [websiteOrSocial, setWebsiteOrSocial] = useState('');
  const [hasPhysicalStore, setHasPhysicalStore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  // Pre-fill user profile info
  useEffect(() => {
    if (visible && user) {
      setApplicantName(userDoc?.displayName || user.displayName || '');
      setApplicantPhone(userDoc?.phoneNumber || (user as any)?.phoneNumber || '');
      setApplicantEmail(user.email || '');
    }
  }, [visible, user, userDoc]);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to submit your seller application.');
      return;
    }

    if (!applicantName.trim()) {
      Alert.alert('Required Field', 'Please enter your contact name.');
      return;
    }
    if (!applicantPhone.trim()) {
      Alert.alert('Required Field', 'Please enter your contact phone / WhatsApp number.');
      return;
    }
    if (!businessName.trim()) {
      Alert.alert('Required Field', 'Please enter your business or brand name.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required Field', 'Please describe the products you craft or sell.');
      return;
    }

    try {
      setSubmitting(true);
      const catObj = CATEGORIES.find((c) => c.key === selectedCategory) || CATEGORIES[0];

      const payload: StoreSellerPayload = {
        businessName: businessName.trim(),
        category: catObj.key,
        categoryLabel: catObj.label,
        description: description.trim(),
        websiteOrSocial: websiteOrSocial.trim() || null,
        hasPhysicalStore,
        cityArea: locality.trim() || null,
      };

      await submitCivicApplication({
        type: 'store_seller',
        typeLabel: 'Store Founding Merchant',
        applicantUid: user.uid,
        applicant: {
          name: applicantName.trim(),
          email: applicantEmail.trim() || user.email || '',
          phone: applicantPhone.trim(),
          photoURL: userDoc?.photoURL || user.photoURL || null,
        },
        cityName: cityName || 'Local Hub',
        locality: locality.trim() || null,
        data: payload,
      });

      Alert.alert(
        'Application Submitted!',
        'Thank you! Your founding merchant application has been received. Our community curators will review it and reach out via WhatsApp / Email.',
        [{ text: 'Great!', onPress: () => { onClose(); onSuccess?.(); } }]
      );
    } catch (err: any) {
      console.error('Failed to submit application:', err);
      Alert.alert('Error', err?.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = () => {
    if (!application?.id) return;

    Alert.alert(
      'Withdraw Application',
      'Are you sure you want to withdraw your seller application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              setWithdrawing(true);
              await withdrawCivicApplication(application.id);
              Alert.alert('Withdrawn', 'Your application has been withdrawn.');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to withdraw application.');
            } finally {
              setWithdrawing(false);
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: 'Approved Merchant', color: '#10B981', bg: '#10B98115' };
      case 'under_review':
        return { label: 'Under Review', color: '#3B82F6', bg: '#3B82F615' };
      case 'rejected':
        return { label: 'Not Selected', color: '#EF4444', bg: '#EF444415' };
      default:
        return { label: 'Pending Review', color: '#F59E0B', bg: '#F59E0B15' };
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Typography variant="h2">Sell on ReCiti Store</Typography>
              <Typography variant="caption" color={colors.textMuted}>
                ReCiti Merchant Program • 0% Launch Commission
              </Typography>
            </View>
            <AnimatedButton onPress={onClose} hapticFeedback="light" style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </AnimatedButton>
          </View>

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {appLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 10 }}>
                  Checking application status...
                </Typography>
              </View>
            ) : application && application.status !== 'withdrawn' ? (
              /* Already Applied View */
              <View style={styles.statusView}>
                <View style={[styles.statusHeroCircle, { backgroundColor: getStatusBadge(application.status).bg }]}>
                  <Ionicons
                    name={application.status === 'approved' ? 'checkmark-circle' : 'hourglass-outline'}
                    size={42}
                    color={getStatusBadge(application.status).color}
                  />
                </View>

                <View style={[styles.statusBadge, { backgroundColor: getStatusBadge(application.status).bg }]}>
                  <Typography
                    variant="caption"
                    weight="bold"
                    color={getStatusBadge(application.status).color}
                  >
                    {getStatusBadge(application.status).label.toUpperCase()}
                  </Typography>
                </View>

                <Typography variant="h2" align="center" style={{ marginTop: 12 }}>
                  {application.data?.businessName || 'Your Application'}
                </Typography>

                <Typography variant="caption" color={colors.textMuted} align="center" style={{ marginTop: 4 }}>
                  Submitted on {new Date(application.appliedAt).toLocaleDateString()} • {application.cityName}
                </Typography>

                <View style={[styles.statusDetailCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Typography variant="caption" color={colors.textMuted}>Category</Typography>
                  <Typography variant="body" weight="medium">{application.data?.categoryLabel || 'Store Item'}</Typography>

                  <View style={{ height: 10 }} />
                  <Typography variant="caption" color={colors.textMuted}>Products & Description</Typography>
                  <Typography variant="body" style={{ marginTop: 2 }}>{application.data?.description}</Typography>

                  {application.review?.notes && (
                    <>
                      <View style={{ height: 10 }} />
                      <Typography variant="caption" color={colors.primary} weight="bold">Curator Note</Typography>
                      <Typography variant="body" style={{ marginTop: 2 }}>{application.review.notes}</Typography>
                    </>
                  )}
                </View>

                <AnimatedButton
                  onPress={onClose}
                  style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
                >
                  <Typography variant="label" weight="bold" color="#FFFFFF">
                    Done
                  </Typography>
                </AnimatedButton>
              </View>
            ) : (
              /* Application Form */
              <View style={styles.formView}>

                {/* Brand / Store Name */}
                <View style={styles.inputGroup}>
                  <Typography variant="label" weight="bold">Shop / Brand Name *</Typography>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    placeholder="e.g., Green Hearth Crafts"
                    placeholderTextColor={colors.textMuted}
                    value={businessName}
                    onChangeText={setBusinessName}
                  />
                </View>

                {/* Category Selection */}
                <View style={styles.inputGroup}>
                  <Typography variant="label" weight="bold">Store / Shop Category *</Typography>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScroll}
                  >
                    {CATEGORIES.map((cat) => {
                      const isSel = selectedCategory === cat.key;
                      return (
                        <AnimatedButton
                          key={cat.key}
                          onPress={() => setSelectedCategory(cat.key)}
                          style={[
                            styles.categoryPill,
                            {
                              backgroundColor: isSel ? colors.primary + '20' : colors.background,
                              borderColor: isSel ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <Ionicons
                            name={cat.icon as any}
                            size={14}
                            color={isSel ? colors.primary : colors.textMuted}
                            style={{ marginRight: 6 }}
                          />
                          <Typography
                            variant="caption"
                            weight={isSel ? 'bold' : 'regular'}
                            color={isSel ? colors.primary : colors.text}
                          >
                            {cat.label}
                          </Typography>
                        </AnimatedButton>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Description */}
                <View style={styles.inputGroup}>
                  <Typography variant="label" weight="bold">What do you craft or sell? *</Typography>
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.textArea,
                      { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
                    ]}
                    placeholder="Describe your products, materials used, handcrafted techniques, or specialties..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={4}
                    value={description}
                    onChangeText={setDescription}
                  />
                </View>

                {/* Locality */}
                <View style={styles.inputGroup}>
                  <Typography variant="label" weight="bold">Locality / Neighborhood</Typography>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    placeholder={`e.g., Indiranagar, ${cityName || 'City'}`}
                    placeholderTextColor={colors.textMuted}
                    value={locality}
                    onChangeText={setLocality}
                  />
                </View>

                {/* Social or Website */}
                <View style={styles.inputGroup}>
                  <Typography variant="label" weight="bold">Instagram / Website / Catalog (Optional)</Typography>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    placeholder="e.g., instagram.com/mycraftshop"
                    placeholderTextColor={colors.textMuted}
                    value={websiteOrSocial}
                    onChangeText={setWebsiteOrSocial}
                    autoCapitalize="none"
                  />
                </View>

                {/* Physical Storefront Switch */}
                <View style={[styles.switchRow, { borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Typography variant="body" weight="medium">Do you have a physical shop or store?</Typography>
                    <Typography variant="caption" color={colors.textMuted}>
                      Select yes if customers can visit a brick-and-mortar shop.
                    </Typography>
                  </View>
                  <Switch
                    value={hasPhysicalStore}
                    onValueChange={setHasPhysicalStore}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Contact Person Details */}
                <View style={styles.inputGroup}>
                  <Typography variant="label" weight="bold">Contact Person *</Typography>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    placeholder="Your Full Name"
                    placeholderTextColor={colors.textMuted}
                    value={applicantName}
                    onChangeText={setApplicantName}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Typography variant="label" weight="bold">WhatsApp / Phone Number *</Typography>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    placeholder="e.g., +91 98765 43210"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    value={applicantPhone}
                    onChangeText={setApplicantPhone}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Typography variant="label" weight="bold">Email Address</Typography>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    placeholder="you@domain.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={applicantEmail}
                    onChangeText={setApplicantEmail}
                  />
                </View>

                {/* Submit Action */}
                <AnimatedButton
                  onPress={handleSubmit}
                  disabled={submitting}
                  style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 10 }]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Typography variant="label" weight="bold" color="#FFFFFF">
                      Submit Founding Merchant Application
                    </Typography>
                  )}
                </AnimatedButton>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    padding: 6,
  },
  scrollBody: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  benefitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  formView: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  textInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: {
    height: 90,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  primaryBtn: {
    display: 'flex',
    width: '100%',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusView: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  statusHeroCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusDetailCard: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
  },
  withdrawBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
});
