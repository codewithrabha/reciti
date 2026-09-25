import React from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { RESIDENT_PASS_CONFIG } from '@/lib/residentPassConfig';

interface ResidentPassModalProps {
  visible: boolean;
  onClose: () => void;
  isUnlockedViaReferral?: boolean;
}

export function ResidentPassModal({
  visible,
  onClose,
  isUnlockedViaReferral = false,
}: ResidentPassModalProps) {
  const { colors, radii } = useTheme();

  const handleSubscribe = () => {
    Alert.alert(
      'Resident Pass VIP Coming Soon',
      'The annual digital Resident Pass payment via UPI/RevenueCat is currently being rolled out. In the meantime, your community referral access remains active!'
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView intensity={30} tint="dark" style={styles.overlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl }]}>
          {/* Handle bar */}
          <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />

          {/* Close Header */}
          <View style={styles.topHeader}>
            <View style={{ flex: 1, gap: 6}}>
              <Typography variant="h3" weight="bold" color={colors.text} style={{ marginTop: 6 }}>
                <Ionicons name="ribbon" size={20} color={colors.subscription} /> ReCiti Resident Pass
              </Typography>
              <Typography variant="caption" weight="bold" color={colors.subscription} style={{ marginTop: 2, fontSize: 13 }}>
                {RESIDENT_PASS_CONFIG.priceTag} · {RESIDENT_PASS_CONFIG.monthlyEquivalent}
              </Typography>
            </View>

            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.background }]}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {isUnlockedViaReferral && (
              <View style={[styles.referralNotice, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                <Typography variant="caption" color={colors.text} style={{ marginLeft: 8, flex: 1, lineHeight: 18 }}>
                  <Typography variant="caption" weight="bold" color={colors.primary}>
                    Rental Access Active via Referrals!{' '}
                  </Typography>
                  You already have direct owner contacts. Upgrading to VIP gives you full 1-year verified resident status across all city rentals.
                </Typography>
              </View>
            )}

            {/* Active Benefits List */}
            <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.perksHeader}>
              INCLUDED IN RESIDENT PASS
            </Typography>

            <View style={styles.perksList}>
              {RESIDENT_PASS_CONFIG.activeBenefits.map((benefit) => (
                <View key={benefit.id} style={[styles.perkItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={[styles.perkIconWrap, { backgroundColor: colors.subscriptionMuted }]}>
                    <Ionicons name={benefit.icon} size={18} color={colors.subscription} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Typography variant="body" weight="bold" color={colors.text} style={{ fontSize: 13 }}>
                      {benefit.title}
                    </Typography>
                    <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 2, lineHeight: 16 }}>
                      {benefit.description}
                    </Typography>
                  </View>
                </View>
              ))}

            </View>

            {/* CTA Button (Locked until RevenueCat integration) */}
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

            <Typography variant="caption" color={colors.textMuted} style={styles.guaranteeText}>
              Zero Brokerage Guarantee · Cancel anytime · Instant activation
            </Typography>
          </ScrollView>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '85%',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderColor: '#FFFFFF15',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  referralNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  perksHeader: {
    letterSpacing: 1,
    marginBottom: 10,
  },
  perksList: {
    gap: 10,
    marginBottom: 20,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  perkIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  subscribeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  guaranteeText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 11,
  },
});
