import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDays, format, isToday, isTomorrow } from 'date-fns';
import { useRouter } from 'expo-router';

import { ServiceItem } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useUser, useUserDoc } from '@/hooks/useAuth';
import { createServiceBooking } from '@/lib/serviceBookingService';

interface ServiceBookingModalProps {
  visible: boolean;
  service: ServiceItem | null;
  categorySlug?: string;
  onClose: () => void;
  onBookingSuccess?: (bookingId: string) => void;
}

export function ServiceBookingModal({
  visible,
  service,
  categorySlug,
  onClose,
  onBookingSuccess,
}: ServiceBookingModalProps) {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const user = useUser();
  const userDoc = useUserDoc();

  // Generate next 14 selectable calendar dates
  const availableDates = useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = addDays(today, i);
      list.push({
        dateStr: format(d, 'yyyy-MM-dd'),
        dayName: isToday(d) ? 'Today' : isTomorrow(d) ? 'Tmrw' : format(d, 'EEE'),
        dayNumber: format(d, 'd'),
        monthName: format(d, 'MMM'),
      });
    }
    return list;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(availableDates[0]?.dateStr || '');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [successBookingId, setSuccessBookingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize/reset form whenever modal opens or service changes
  useEffect(() => {
    if (visible && service) {
      setSelectedDate(availableDates[0]?.dateStr || '');
      const defaultSlots = service.timeSlots && service.timeSlots.length > 0
        ? service.timeSlots
        : ['09:00 AM', '10:30 AM', '12:00 PM', '02:30 PM', '04:00 PM', '05:30 PM'];
      setSelectedSlot(defaultSlots[0] || '10:00 AM');
      setCustomerName(user?.displayName || userDoc?.displayName || '');
      setCustomerPhone('');
      setNotes('');
      setSubmitting(false);
      setSuccessBookingId(null);
      setErrorMessage(null);
    }
  }, [visible, service, user, userDoc, availableDates]);

  if (!service) return null;

  const timeSlots = service.timeSlots && service.timeSlots.length > 0
    ? service.timeSlots
    : ['09:00 AM', '10:30 AM', '12:00 PM', '02:30 PM', '04:00 PM', '05:30 PM'];

  const handleConfirm = async () => {
    if (!customerName.trim()) {
      setErrorMessage('Please enter your name');
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 10) {
      setErrorMessage('Please enter a valid 10-digit phone number');
      return;
    }
    if (!selectedDate || !selectedSlot) {
      setErrorMessage('Please pick a date and time slot');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const bookingId = await createServiceBooking({
        serviceId: service.id,
        serviceTitle: service.title,
        categorySlug: categorySlug || service.categoryId || service.linkedCategoryIds?.[0],
        providerUserId: service.providerUserId,
        providerName: service.providerName,
        providerPhone: service.providerPhone,
        directoryId: service.directoryId,
        userId: user?.uid || 'guest',
        userName: customerName.trim(),
        userPhone: customerPhone.trim(),
        userEmail: user?.email || undefined,
        bookingDate: selectedDate,
        timeSlot: selectedSlot,
        totalPrice: service.price,
        notes: notes.trim() || undefined,
      });

      setSuccessBookingId(bookingId);
      onBookingSuccess?.(bookingId);
    } catch (err: any) {
      console.warn('[ServiceBookingModal] Submission error:', err);
      setErrorMessage(err.message || 'Failed to submit booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View style={[styles.sheetContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Sheet Handle */}
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            {/* Header */}
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Typography variant="h2" style={{ fontSize: 18, fontWeight: '800' }}>
                  {successBookingId ? 'Booking Confirmed' : 'Book Service'}
                </Typography>
                <Typography variant="caption" color={colors.textMuted} numberOfLines={1}>
                  {service.title} • {service.providerName}
                </Typography>
              </View>
              <AnimatedButton onPress={onClose} style={styles.closeBtn} hapticFeedback="light">
                <Ionicons name="close" size={20} color={colors.text} />
              </AnimatedButton>
            </View>

            {successBookingId ? (
              /* Success Screen */
              <View style={styles.successContainer}>
                <View style={[styles.successIconCircle, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="checkmark-circle" size={54} color={colors.primary} />
                </View>

                <Typography variant="h2" style={{ fontSize: 20, fontWeight: '800', marginTop: 16 }}>
                  Booking Request Sent!
                </Typography>

                <Typography
                  variant="body"
                  color={colors.textMuted}
                  style={{ textAlign: 'center', marginTop: 8, paddingHorizontal: 20 }}
                >
                  Your booking for <Typography variant="body" weight="bold">{service.title}</Typography> with{' '}
                  <Typography variant="body" weight="bold">{service.providerName}</Typography> has been received for{' '}
                  <Typography variant="body" weight="bold">{selectedDate}</Typography> at{' '}
                  <Typography variant="body" weight="bold">{selectedSlot}</Typography>.
                </Typography>

                <View style={[styles.refBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Typography variant="caption" color={colors.textMuted}>
                    Booking Reference:
                  </Typography>
                  <Typography variant="caption" weight="bold" color={colors.primary} style={{ marginTop: 2 }}>
                    #{successBookingId.slice(0, 10).toUpperCase()}
                  </Typography>
                </View>

                <AnimatedButton
                  onPress={() => {
                    onClose();
                    router.push('/bookings');
                  }}
                  style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: 24, width: '100%', flexDirection: 'row', gap: 6 }]}
                  hapticFeedback="medium"
                >
                  <Ionicons name="calendar-outline" size={17} color="#fff" />
                  <Typography variant="body" weight="bold" style={{ color: '#fff' }}>
                    View My Bookings
                  </Typography>
                </AnimatedButton>

                <AnimatedButton
                  onPress={onClose}
                  style={[styles.actionBtn, { backgroundColor: 'transparent', marginTop: 8, width: '100%', borderWidth: 1, borderColor: colors.border }]}
                  hapticFeedback="light"
                >
                  <Typography variant="body" weight="medium" style={{ color: colors.text }}>
                    Done
                  </Typography>
                </AnimatedButton>
              </View>
            ) : (
              /* Interactive Booking Form */
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Service Snapshot Pill */}
                <View style={[styles.snapshotCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Typography variant="body" weight="bold">
                      {service.title}
                    </Typography>
                    <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                      {service.durationMinutes ? `⏱️ ${service.durationMinutes} mins duration • ` : ''}
                      {service.price > 0 ? `₹${service.price.toLocaleString('en-IN')}` : 'Free'}
                    </Typography>
                  </View>
                  <View style={[styles.priceTag, { backgroundColor: colors.primary + '18' }]}>
                    <Typography variant="body" weight="bold" color={colors.primary}>
                      {service.price > 0 ? `₹${service.price}` : 'Free'}
                    </Typography>
                  </View>
                </View>

                {/* 1. Date Selector Strip */}
                <View style={styles.section}>
                  <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionTitle}>
                    1. SELECT DATE
                  </Typography>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.datesRow}
                    overScrollMode="never"
                  >
                    {availableDates.map((item) => {
                      const isSelected = selectedDate === item.dateStr;
                      return (
                        <AnimatedButton
                          key={item.dateStr}
                          onPress={() => setSelectedDate(item.dateStr)}
                          hapticFeedback="light"
                          style={[
                            styles.datePill,
                            {
                              backgroundColor: isSelected ? colors.primary : colors.background,
                              borderColor: isSelected ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <Typography
                            variant="caption"
                            style={{
                              fontSize: 11,
                              color: isSelected ? '#fff' : colors.textMuted,
                              fontWeight: isSelected ? '700' : '500',
                            }}
                          >
                            {item.dayName}
                          </Typography>
                          <Typography
                            variant="h3"
                            style={{
                              fontSize: 17,
                              fontWeight: '800',
                              color: isSelected ? '#fff' : colors.text,
                              marginVertical: 2,
                            }}
                          >
                            {item.dayNumber}
                          </Typography>
                          <Typography
                            variant="caption"
                            style={{
                              fontSize: 10,
                              color: isSelected ? '#fff' : colors.textMuted,
                            }}
                          >
                            {item.monthName}
                          </Typography>
                        </AnimatedButton>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* 2. Time Slot Selector */}
                <View style={styles.section}>
                  <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionTitle}>
                    2. SELECT TIME SLOT
                  </Typography>
                  <View style={styles.slotsWrap}>
                    {timeSlots.map((slot) => {
                      const isSelected = selectedSlot === slot;
                      return (
                        <AnimatedButton
                          key={slot}
                          onPress={() => setSelectedSlot(slot)}
                          hapticFeedback="light"
                          style={[
                            styles.slotPill,
                            {
                              backgroundColor: isSelected ? colors.primary : colors.background,
                              borderColor: isSelected ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <Ionicons
                            name="time-outline"
                            size={12}
                            color={isSelected ? '#fff' : colors.textMuted}
                            style={{ marginRight: 4 }}
                          />
                          <Typography
                            variant="caption"
                            weight={isSelected ? 'bold' : 'regular'}
                            style={{
                              color: isSelected ? '#fff' : colors.text,
                              fontSize: 12,
                            }}
                          >
                            {slot}
                          </Typography>
                        </AnimatedButton>
                      );
                    })}
                  </View>
                </View>

                {/* 3. Customer Contact Info */}
                <View style={styles.section}>
                  <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionTitle}>
                    3. CONTACT DETAILS
                  </Typography>

                  <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Ionicons name="person-outline" size={16} color={colors.textMuted} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Your Full Name"
                      placeholderTextColor={colors.textMuted}
                      value={customerName}
                      onChangeText={setCustomerName}
                    />
                  </View>

                  <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border, marginTop: 8 }]}>
                    <Ionicons name="call-outline" size={16} color={colors.textMuted} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="10-digit Phone Number"
                      placeholderTextColor={colors.textMuted}
                      value={customerPhone}
                      onChangeText={setCustomerPhone}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>

                  <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border, marginTop: 8, alignItems: 'flex-start', minHeight: 70 }]}>
                    <Ionicons name="document-text-outline" size={16} color={colors.textMuted} style={{ marginTop: 2 }} />
                    <TextInput
                      style={[styles.input, { color: colors.text, textAlignVertical: 'top' }]}
                      placeholder="Notes or special requests (optional)"
                      placeholderTextColor={colors.textMuted}
                      value={notes}
                      onChangeText={setNotes}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>

                {/* Error Banner */}
                {errorMessage && (
                  <View style={[styles.errorBanner, { backgroundColor: '#FF3B3018', borderColor: '#FF3B3044' }]}>
                    <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                    <Typography variant="caption" style={{ color: '#FF3B30', marginLeft: 6, flex: 1 }}>
                      {errorMessage}
                    </Typography>
                  </View>
                )}

                {/* Confirm Action Button */}
                <AnimatedButton
                  onPress={handleConfirm}
                  disabled={submitting}
                  style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
                  hapticFeedback="medium"
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Typography variant="body" weight="bold" style={{ color: '#fff', fontSize: 15 }}>
                      Confirm Booking ({service.price > 0 ? `₹${service.price}` : 'Free'})
                    </Typography>
                  )}
                </AnimatedButton>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
    width: '100%',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '88%',
    paddingBottom: 24,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  snapshotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  priceTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  datesRow: {
    gap: 8,
    paddingBottom: 4,
  },
  datePill: {
    width: 64,
    height: 72,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  slotsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    padding: 0,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  actionBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successContainer: {
    padding: 24,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refBox: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
});
