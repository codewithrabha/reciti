import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useAuthStore } from '@/store/authStore';
import { uploadImage } from '@/lib/storage';
import { submitStayIntel } from '@/lib/referralService';
import { useCategorySubcategories } from '@/lib/directoryService';

const HOUSING_AMENITIES_OPTIONS = [
  'High-Speed WiFi',
  'Air Conditioner (AC)',
  'Geyser (Hot Water)',
  'RO Purified Water',
  'Washing Machine',
  'Power Backup / Inverter',
  'CCTV Surveillance',
  'Security Guard',
  'Study Table & Chair',
  'Wardrobe / Cupboard',
  'Balcony / Terrace',
  'Daily Room Cleaning',
  'Attached Washroom',
  'Elevator / Lift',
];

export default function HousingContributeScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // Stepper state (1, 2, 3)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Category subcategories
  const housingSubcategories = useCategorySubcategories('housing_rentals');

  // ─── Step 1: Identity & Location ──────────────────────────────────────────
  const [propertyType, setPropertyType] = useState<string>('pg');
  const [propertyName, setPropertyName] = useState('');
  const [city, setCity] = useState('Bongaigaon');
  const [locality, setLocality] = useState('');
  const [address, setAddress] = useState('');
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState('');

  // GPS detection state
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'detecting' | 'detected' | 'denied' | 'error'>('idle');

  useEffect(() => {
    if (housingSubcategories.length > 0 && !housingSubcategories.some((s) => s.key === propertyType)) {
      setPropertyType(housingSubcategories[0].key);
    }
  }, [housingSubcategories, propertyType]);

  // ─── Step 2: Pricing, Amenities & Mandatory Photos ────────────────────────
  const [monthlyRent, setMonthlyRent] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [maintenanceCharges, setMaintenanceCharges] = useState('');
  const [localPhotos, setLocalPhotos] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    'High-Speed WiFi',
    'RO Purified Water',
  ]);
  const [electricityType, setElectricityType] = useState<'submeter_unit' | 'included' | 'separate_bill'>('submeter_unit');
  const [waterSupply, setWaterSupply] = useState<'24_hours' | 'timed' | 'borewell'>('24_hours');
  const [parkingType, setParkingType] = useState<'bike_only' | 'car_bike' | 'street' | 'none'>('bike_only');
  const [foodIncluded, setFoodIncluded] = useState(true);
  const [foodType, setFoodType] = useState<'veg_only' | 'veg_nonveg' | 'none'>('veg_nonveg');
  const [curfewTime, setCurfewTime] = useState('10:00 PM');
  const [bhkType, setBhkType] = useState<'1_bhk' | '2_bhk' | '3_bhk' | '1_rk'>('2_bhk');
  const [furnishingStatus, setFurnishingStatus] = useState<'semi_furnished' | 'fully_furnished' | 'unfurnished'>('semi_furnished');

  // ─── Step 3: Direct Owner Details & Vacancy ───────────────────────────────
  const [landlordName, setLandlordName] = useState('');
  const [landlordPhone, setLandlordPhone] = useState('');
  const [vacatingSoon, setVacatingSoon] = useState(true);
  const [moveOutDate, setMoveOutDate] = useState('End of this month');
  const [vacatingNote, setVacatingNote] = useState('');
  const [isZeroBrokerCertified, setIsZeroBrokerCertified] = useState(false);

  // ─── GPS Auto-Detection Handler ───────────────────────────────────────────
  const handleDetectGPS = async () => {
    setGpsStatus('detecting');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsStatus('denied');
        Alert.alert(
          'Location Permission Denied',
          'Please allow location access to auto-detect the property coordinates, or type the address manually below.'
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      setCoords({ latitude, longitude });
      setGpsStatus('detected');

      // Attempt reverse geocoding to prefill locality & address
      try {
        const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (reverse && reverse.length > 0) {
          const res = reverse[0];
          const detectedCity = res.city || res.subregion || res.region;
          if (detectedCity) setCity(detectedCity);

          const detectedLocality = [res.name, res.district, res.street].filter(Boolean).join(', ');
          if (detectedLocality && !locality.trim()) {
            setLocality(detectedLocality);
          }
          if (!address.trim()) {
            const formatted = [res.street, res.district, res.city, res.postalCode].filter(Boolean).join(', ');
            if (formatted) setAddress(formatted);
          }
        }
      } catch {
        // Geocode error ignored
      }
    } catch (err: any) {
      console.warn('[HousingContribute] GPS Detection error:', err);
      setGpsStatus('error');
      Alert.alert('GPS Detection Failed', 'Could not detect your exact position. Please type the address manually.');
    }
  };

  // ─── Photo Picker Handlers ────────────────────────────────────────────────
  const handleTakePhoto = async () => {
    if (localPhotos.length >= 6) {
      Alert.alert('Limit reached', 'You can upload up to 6 real accommodation photos.');
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please grant camera access in Settings to take photos.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setLocalPhotos((prev) => [...prev, res.assets[0].uri]);
    }
  };

  const handlePickFromGallery = async () => {
    if (localPhotos.length >= 6) {
      Alert.alert('Limit reached', 'You can upload up to 6 real accommodation photos.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please grant photo library access in Settings.');
      return;
    }
    const remaining = 6 - localPhotos.length;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
    });
    if (!res.canceled && res.assets) {
      const uris = res.assets.map((a) => a.uri);
      setLocalPhotos((prev) => [...prev, ...uris].slice(0, 6));
    }
  };

  const handleRemovePhoto = (index: number) => {
    setLocalPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleAmenity = (item: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  // ─── Step Navigation & Validation ─────────────────────────────────────────
  const validateStep1 = () => {
    if (!locality.trim()) {
      Alert.alert('Locality Required', 'Please enter the locality or neighborhood area (e.g. College Road).');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!monthlyRent.trim() || isNaN(Number(monthlyRent)) || Number(monthlyRent) <= 0) {
      Alert.alert('Rent Required', 'Please enter a valid monthly rent amount in ₹.');
      return false;
    }
    if (localPhotos.length === 0) {
      Alert.alert(
        'Mandatory Photo Required',
        'Please take or upload at least 1 real photo of the accommodation (room, building, or entrance). Real photos ensure genuine zero-broker listings.'
      );
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep === 3) setCurrentStep(2);
    else if (currentStep === 2) setCurrentStep(1);
    else router.back();
  };

  // ─── Final Submission ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to submit accommodation details.');
      return;
    }
    if (!landlordName.trim()) {
      Alert.alert('Landlord Name Required', 'Please enter the owner or manager name.');
      return;
    }
    const cleanPhone = landlordPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Valid Phone Required', 'Please provide a valid 10-digit direct owner contact number.');
      return;
    }
    if (!isZeroBrokerCertified) {
      Alert.alert(
        'Anti-Broker Confirmation',
        'Please certify that this is a direct landlord/owner listing and NOT a brokerage listing.'
      );
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload photos to Cloudinary
      const uploadedImageUrls: string[] = [];
      for (let i = 0; i < localPhotos.length; i++) {
        const uri = localPhotos[i];
        const timestamp = Date.now();
        const cloudPath = `directories/stay_intel_${user.uid}_${timestamp}_${i}.jpg`;
        const cloudUrl = await uploadImage(uri, cloudPath);
        uploadedImageUrls.push(cloudUrl);
      }

      // 2. Submit to Firestore via service
      const res = await submitStayIntel(user, {
        propertyType,
        propertyName: propertyName.trim() || undefined,
        locality: locality.trim(),
        address: address.trim() || undefined,
        city: city.trim() || 'Bongaigaon',
        latitude: coords?.latitude ?? 26.505,
        longitude: coords?.longitude ?? 90.54,
        googleBusinessUrl: googleBusinessUrl.trim() || undefined,
        monthlyRent: Number(monthlyRent),
        securityDeposit: securityDeposit ? Number(securityDeposit) : undefined,
        maintenanceCharges: maintenanceCharges.trim() || undefined,
        electricityType,
        waterSupply,
        parkingType,
        amenitiesList: selectedAmenities,
        foodIncluded,
        foodType: foodIncluded ? foodType : 'none',
        curfewTime: curfewTime.trim() || undefined,
        vacatingSoon,
        moveOutDate: vacatingSoon ? moveOutDate.trim() : undefined,
        vacatingNote: vacatingNote.trim() || undefined,
        landlordName: landlordName.trim(),
        landlordPhone: cleanPhone,
        images: uploadedImageUrls,
      });

      if (res.success) {
        setIsSubmitted(true);
      } else {
        Alert.alert('Submission Error', res.error || 'Failed to submit accommodation details.');
      }
    } catch (err: any) {
      console.error('[HousingContribute] Submit error:', err);
      Alert.alert('Submission Error', err?.message || 'Something went wrong while submitting.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render Success View ──────────────────────────────────────────────────
  if (isSubmitted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.successWrapper}>
          <View style={[styles.successIconCircle, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="shield-checkmark" size={64} color={colors.primary} />
          </View>

          <Typography variant="h2" weight="bold" align="center" style={{ marginTop: 20 }}>
            Submission Received!
          </Typography>

          <Typography variant="body" color={colors.textMuted} align="center" style={{ marginTop: 10, lineHeight: 22 }}>
            Thank you for contributing to our zero-broker housing community.
          </Typography>

          <View style={[styles.successInfoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.successInfoRow}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Typography variant="caption" weight="bold" color={colors.text}>
                  Verification in 1/2 - 1 Hours
                </Typography>
                <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                  Our municipal team will quickly verify the landlord contact number and genuine photos.
                </Typography>
              </View>
            </View>

            <View style={[styles.successInfoRow, { marginTop: 14 }]}>
              <Ionicons name="gift-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Typography variant="caption" weight="bold" color={colors.text}>
                  +50 Civic Points & Full Unlock
                </Typography>
                <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                  Once verified, your account automatically unlocks all landlord contacts across the city!
                </Typography>
              </View>
            </View>
          </View>

          <AnimatedButton
            onPress={() => router.replace('/(tabs)/directories')}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 28, width: '100%' }]}
          >
            <Typography variant="body" weight="bold" color="#FFFFFF">
              Done
            </Typography>
          </AnimatedButton>
        </View>
      </View>
    );
  }

  // ─── Main Stepper View ────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header bar */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12), borderBottomColor: colors.border }]}>
        <Pressable onPress={handleBack} hitSlop={12} style={styles.backBtn}>
          <Ionicons name={currentStep === 1 ? 'close' : 'chevron-back'} size={24} color={colors.text} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Typography variant="body" weight="bold" color={colors.text}>
            Contribute Accommodation
          </Typography>
          <Typography variant="caption" color={colors.primary} weight="semiBold">
            Step {currentStep} of 3 • {currentStep === 1 ? 'Identity & Location' : currentStep === 2 ? 'Rent & Real Photos' : 'Landlord Contact'}
          </Typography>
        </View>

        <View style={{ width: 32 }} />
      </View>

      {/* Step Indicator Progress Bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor: colors.primary,
              width: currentStep === 1 ? '33.3%' : currentStep === 2 ? '66.6%' : '100%',
            },
          ]}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 90 },
          ]}
        >
          {/* ════════════════════════════════════════════════════════════════
              STEP 1: Property Identity & GPS Location
             ════════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <View>
              {/* Civic Notice */}
              <View style={[styles.civicNotice, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
                <Ionicons name="sparkles" size={20} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Typography variant="caption" weight="bold" color={colors.primary}>
                    Zero-Broker Community Registry
                  </Typography>
                  <Typography variant="caption" color={colors.text} style={{ marginTop: 2 }}>
                    Help students & residents find genuine stays. Once verified by admin, you will receive full unlock access!
                  </Typography>
                </View>
              </View>

              {/* Accommodation Type */}
              <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionHeading}>
                1. ACCOMMODATION TYPE *
              </Typography>
              <View style={styles.chipsWrap}>
                {housingSubcategories.map((sub) => {
                  const isSelected = propertyType === sub.key;
                  return (
                    <AnimatedButton
                      key={sub.key}
                      onPress={() => setPropertyType(sub.key)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Typography
                        variant="caption"
                        weight={isSelected ? 'bold' : 'regular'}
                        color={isSelected ? '#FFFFFF' : colors.text}
                      >
                        {sub.label}
                      </Typography>
                    </AnimatedButton>
                  );
                })}
              </View>

              {/* Property / Building Name */}
              <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionHeading}>
                2. PROPERTY / BUILDING NAME
              </Typography>
              <TextInput
                placeholder="e.g. Krishna Niwas, Greenwood PG, Das Villa"
                placeholderTextColor={colors.textMuted}
                value={propertyName}
                onChangeText={setPropertyName}
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              />

              {/* GPS Location Auto-Detection */}
              <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionHeading}>
                3. EXACT GPS COORDINATES *
              </Typography>
              <View style={[styles.gpsCard, { backgroundColor: colors.surface, borderColor: coords ? colors.primary : colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Typography variant="body" weight="bold" color={colors.text}>
                    {coords ? '📍 GPS Position Locked' : 'Automatic GPS Detection'}
                  </Typography>
                  <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                    {coords
                      ? `${coords.latitude.toFixed(5)}° N, ${coords.longitude.toFixed(5)}° E`
                      : 'Capture precise location coordinates for prospective tenants.'}
                  </Typography>
                </View>

                <AnimatedButton
                  onPress={handleDetectGPS}
                  disabled={gpsStatus === 'detecting'}
                  style={[styles.gpsBtn, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
                >
                  {gpsStatus === 'detecting' ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name={coords ? 'checkmark-circle' : 'locate'} size={18} color={colors.primary} />
                      <Typography variant="caption" weight="bold" color={colors.primary} style={{ marginLeft: 4 }}>
                        {coords ? 'Redetect' : 'Detect GPS'}
                      </Typography>
                    </>
                  )}
                </AnimatedButton>
              </View>

              {/* Locality & Address */}
              <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionHeading}>
                4. LOCALITY & ADDRESS *
              </Typography>
              <TextInput
                placeholder="Locality / Area (e.g. College Road, Ward 4, Station Road) *"
                placeholderTextColor={colors.textMuted}
                value={locality}
                onChangeText={setLocality}
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              />

              <TextInput
                placeholder="Full Street / Landmark Address (Optional)"
                placeholderTextColor={colors.textMuted}
                value={address}
                onChangeText={setAddress}
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, marginTop: 8 }]}
              />

              <TextInput
                placeholder="Google Maps / Business Share Link (Optional)"
                placeholderTextColor={colors.textMuted}
                value={googleBusinessUrl}
                onChangeText={setGoogleBusinessUrl}
                autoCapitalize="none"
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, marginTop: 8 }]}
              />
            </View>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 2: Pricing, Amenities & Mandatory Photos
             ════════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <View>
              {/* Monthly Rent & Deposit */}
              <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionHeading}>
                1. RENT & DEPOSIT *
              </Typography>
              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Typography variant="caption" color={colors.textMuted} style={{ marginBottom: 4 }}>
                    Monthly Rent (₹) *
                  </Typography>
                  <TextInput
                    placeholder="e.g. 4500"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={monthlyRent}
                    onChangeText={setMonthlyRent}
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Typography variant="caption" color={colors.textMuted} style={{ marginBottom: 4 }}>
                    Security Deposit (₹)
                  </Typography>
                  <TextInput
                    placeholder="e.g. 4500 (or 0)"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={securityDeposit}
                    onChangeText={setSecurityDeposit}
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  />
                </View>
              </View>

              {/* Maintenance Charges */}
              <TextInput
                placeholder="Maintenance / Electricity note (e.g. ₹500 or Included)"
                placeholderTextColor={colors.textMuted}
                value={maintenanceCharges}
                onChangeText={setMaintenanceCharges}
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, marginTop: 10 }]}
              />

              {/* MANDATORY REAL PHOTOS */}
              <View style={{ marginTop: 22 }}>
                <View style={styles.photoHeadingRow}>
                  <Typography variant="caption" weight="bold" color={colors.textMuted}>
                    2. REAL ACCOMMODATION PHOTOS (MANDATORY) *
                  </Typography>
                </View>

                <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 3, marginBottom: 10 }}>
                  Upload at least 1 real photo of the room, building, or entrance. Submissions with stock/fake photos will be rejected by admin.
                </Typography>

                {/* Photo Previews */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                  {localPhotos.map((uri, idx) => (
                    <View key={uri + idx} style={[styles.photoThumbWrap, { borderColor: colors.border }]}>
                      <Image source={{ uri }} style={styles.photoThumb} />
                      {idx === 0 && (
                        <View style={[styles.coverBadge, { backgroundColor: colors.primary }]}>
                          <Typography variant="caption" weight="bold" color="#FFFFFF" style={{ fontSize: 9 }}>
                            COVER
                          </Typography>
                        </View>
                      )}
                      <Pressable
                        onPress={() => handleRemovePhoto(idx)}
                        style={styles.deletePhotoBtn}
                        hitSlop={8}
                      >
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  ))}

                  {/* Add Photo Buttons */}
                  {localPhotos.length < 6 && (
                    <View style={styles.photoActionsRow}>
                      <AnimatedButton
                        onPress={handleTakePhoto}
                        style={[styles.addPhotoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      >
                        <Ionicons name="camera" size={24} color={colors.primary} />
                        <Typography variant="caption" weight="bold" color={colors.primary} style={{ marginTop: 4 }}>
                          Take Photo
                        </Typography>
                      </AnimatedButton>

                      <AnimatedButton
                        onPress={handlePickFromGallery}
                        style={[styles.addPhotoCard, { backgroundColor: colors.surface, borderColor: colors.border, marginLeft: 8 }]}
                      >
                        <Ionicons name="images" size={24} color={colors.primary} />
                        <Typography variant="caption" weight="bold" color={colors.primary} style={{ marginTop: 4 }}>
                          Gallery
                        </Typography>
                      </AnimatedButton>
                    </View>
                  )}
                </ScrollView>
              </View>

              {/* Utilities & Living Specs */}
              <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionHeading}>
                3. LIVING AMENITIES
              </Typography>
              <View style={styles.chipsWrap}>
                {HOUSING_AMENITIES_OPTIONS.map((item) => {
                  const isSelected = selectedAmenities.includes(item);
                  return (
                    <AnimatedButton
                      key={item}
                      onPress={() => toggleAmenity(item)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? colors.primary + '18' : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                        size={14}
                        color={isSelected ? colors.primary : colors.textMuted}
                      />
                      <Typography
                        variant="caption"
                        weight={isSelected ? 'bold' : 'regular'}
                        color={isSelected ? colors.primary : colors.text}
                        style={{ marginLeft: 4 }}
                      >
                        {item}
                      </Typography>
                    </AnimatedButton>
                  );
                })}
              </View>

              {/* Utility Specs: Electricity, Water, Parking */}
              <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionHeading}>
                4. UTILITIES & RULES
              </Typography>

              {/* Electricity */}
              <View style={styles.specChoiceGroup}>
                <Typography variant="caption" weight="semiBold" color={colors.text}>
                  ⚡ Electricity Billing:
                </Typography>
                <View style={styles.choicePillsRow}>
                  {[
                    { key: 'submeter_unit', label: 'Sub-meter Unit' },
                    { key: 'included', label: 'Included in Rent' },
                    { key: 'separate_bill', label: 'Separate Bill' },
                  ].map((opt) => (
                    <AnimatedButton
                      key={opt.key}
                      onPress={() => setElectricityType(opt.key as any)}
                      style={[
                        styles.choicePill,
                        {
                          backgroundColor: electricityType === opt.key ? colors.primary : colors.surface,
                          borderColor: electricityType === opt.key ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Typography
                        variant="caption"
                        color={electricityType === opt.key ? '#FFFFFF' : colors.text}
                        weight={electricityType === opt.key ? 'bold' : 'regular'}
                      >
                        {opt.label}
                      </Typography>
                    </AnimatedButton>
                  ))}
                </View>
              </View>

              {/* Food & Mess for PG/Hostel */}
              {(propertyType === 'pg' || propertyType === 'hostel' || propertyType.includes('pg')) && (
                <View style={[styles.messCard, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 12 }]}>
                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1 }}>
                      <Typography variant="label" weight="bold" color={colors.text}>
                        🍱 Mess / Food Included
                      </Typography>
                      <Typography variant="caption" color={colors.textMuted}>
                        Does this PG provide daily meals?
                      </Typography>
                    </View>
                    <Switch
                      value={foodIncluded}
                      onValueChange={setFoodIncluded}
                      trackColor={{ false: colors.border, true: colors.primary }}
                    />
                  </View>

                  {foodIncluded && (
                    <View style={{ marginTop: 10 }}>
                      <Typography variant="caption" weight="semiBold" color={colors.text}>
                        Food Type:
                      </Typography>
                      <View style={[styles.choicePillsRow, { marginTop: 6 }]}>
                        {[
                          { key: 'veg_nonveg', label: 'Veg & Non-Veg' },
                          { key: 'veg_only', label: 'Pure Veg Only' },
                        ].map((opt) => (
                          <AnimatedButton
                            key={opt.key}
                            onPress={() => setFoodType(opt.key as any)}
                            style={[
                              styles.choicePill,
                              {
                                backgroundColor: foodType === opt.key ? colors.primary : colors.background,
                                borderColor: foodType === opt.key ? colors.primary : colors.border,
                              },
                            ]}
                          >
                            <Typography
                              variant="caption"
                              color={foodType === opt.key ? '#FFFFFF' : colors.text}
                              weight={foodType === opt.key ? 'bold' : 'regular'}
                            >
                              {opt.label}
                            </Typography>
                          </AnimatedButton>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 3: Direct Owner Details & Vacancy
             ════════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <View>
              {/* Direct Landlord Contact */}
              <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionHeading}>
                1. DIRECT OWNER / LANDLORD DETAILS *
              </Typography>
              <TextInput
                placeholder="Owner / Landlord Name (e.g. Ramesh Kalita) *"
                placeholderTextColor={colors.textMuted}
                value={landlordName}
                onChangeText={setLandlordName}
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              />

              <TextInput
                placeholder="Owner 10-Digit Mobile Number *"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
                value={landlordPhone}
                onChangeText={setLandlordPhone}
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, marginTop: 8 }]}
              />

              {/* Vacancy Status */}
              <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionHeading}>
                2. AVAILABILITY & VACANCY *
              </Typography>
              <View style={styles.rowInputs}>
                <AnimatedButton
                  onPress={() => setVacatingSoon(false)}
                  style={[
                    styles.vacancyBtn,
                    {
                      backgroundColor: !vacatingSoon ? colors.primary + '18' : colors.surface,
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
                    Available Right Now
                  </Typography>
                </AnimatedButton>

                <AnimatedButton
                  onPress={() => setVacatingSoon(true)}
                  style={[
                    styles.vacancyBtn,
                    {
                      backgroundColor: vacatingSoon ? colors.primary + '18' : colors.surface,
                      borderColor: vacatingSoon ? colors.primary : colors.border,
                      marginLeft: 10,
                    },
                  ]}
                >
                  <Ionicons
                    name={vacatingSoon ? 'radio-button-on' : 'radio-button-off'}
                    size={16}
                    color={vacatingSoon ? colors.primary : colors.textMuted}
                  />
                  <Typography variant="caption" weight={vacatingSoon ? 'bold' : 'regular'} style={{ marginLeft: 6 }}>
                    Vacating Soon (Upcoming)
                  </Typography>
                </AnimatedButton>
              </View>

              {vacatingSoon && (
                <TextInput
                  placeholder="Expected Date Available (e.g. End of this month, 1st April)"
                  placeholderTextColor={colors.textMuted}
                  value={moveOutDate}
                  onChangeText={setMoveOutDate}
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border, marginTop: 8 }]}
                />
              )}

              {/* Tenant Insider Note */}
              <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionHeading}>
                3. INSIDER / TENANT NOTE (OPTIONAL)
              </Typography>
              <TextInput
                placeholder="e.g. Room 202 on second floor opening up. Great sunlight, quiet environment, very supportive landlord family."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={vacatingNote}
                onChangeText={setVacatingNote}
                style={[
                  styles.textArea,
                  { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
                ]}
              />

              {/* Zero-Broker Commitment */}
              <View style={[styles.certCard, { backgroundColor: colors.surface, borderColor: isZeroBrokerCertified ? colors.primary : colors.border, marginTop: 18 }]}>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Typography variant="body" weight="bold" color={colors.text}>
                      🛡️ 100% Zero-Broker Guarantee
                    </Typography>
                    <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                      I certify that this is a direct landlord listing and NOT a broker or commercial agent listing.
                    </Typography>
                  </View>
                  <Switch
                    value={isZeroBrokerCertified}
                    onValueChange={setIsZeroBrokerCertified}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Bottom Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
        {currentStep > 1 && (
          <AnimatedButton
            onPress={handleBack}
            disabled={submitting}
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
          >
            <Typography variant="body" weight="semiBold" color={colors.text}>
              Back
            </Typography>
          </AnimatedButton>
        )}

        {currentStep < 3 ? (
          <AnimatedButton
            onPress={handleNext}
            style={[styles.primaryBtn, { backgroundColor: colors.primary, flex: 1, marginLeft: currentStep > 1 ? 12 : 0 }]}
          >
            <Typography variant="body" weight="bold" color="#FFFFFF">
              Continue Next
            </Typography>
          </AnimatedButton>
        ) : (
          <AnimatedButton
            onPress={handleSubmit}
            disabled={submitting}
            style={[
              styles.primaryBtn,
              {
                backgroundColor: colors.primary,
                flex: 1,
                marginLeft: 12,
                opacity: submitting ? 0.7 : 1,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Typography variant="body" weight="bold" color="#FFFFFF" style={{ marginRight: 8 }}>
                  Submit Details
                </Typography>
                <Ionicons name="rocket-outline" size={18} color="#FFFFFF" />
              </>
            )}
          </AnimatedButton>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  progressTrack: {
    height: 4,
    width: '100%',
    backgroundColor: '#E2E8F0',
  },
  progressBar: {
    height: '100%',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  civicNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeading: {
    marginTop: 18,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
  },
  textArea: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 12,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  photoHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photosScroll: {
    flexDirection: 'row',
    marginTop: 8,
  },
  photoThumbWrap: {
    width: 90,
    height: 90,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActionsRow: {
    flexDirection: 'row',
  },
  addPhotoCard: {
    width: 90,
    height: 90,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  specChoiceGroup: {
    marginTop: 10,
  },
  choicePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  choicePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  messCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vacancyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  certCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  secondaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successWrapper: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successInfoCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
  },
  successInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
