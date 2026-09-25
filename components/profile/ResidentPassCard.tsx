import React, { useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { User, UserEntitlement } from '@/types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { TierProgress } from '@/components/pulse/TierProgress';
import { ResidentPassModal } from './ResidentPassModal';
import { getEntitlementCapabilities } from '@/lib/entitlementRules';

interface ResidentPassCardProps {
  entitlement: UserEntitlement | null;
  referralCode: string;
  userDoc: User | null;
  onShareReferral: () => void;
}

export function ResidentPassCard({
  entitlement,
  referralCode,
  userDoc,
  onShareReferral,
}: ResidentPassCardProps) {
  const { colors, spacing } = useTheme();
  const [copied, setCopied] = useState(false);
  const [passModalVisible, setPassModalVisible] = useState(false);

  // Centralized capabilities matrix
  const {
    theme,
    isResidentPassVip,
    canViewLandlordPhone,
    provenance,
  } = getEntitlementCapabilities(entitlement);

  const isUnlocked = canViewLandlordPhone;
  const qualifiedCount = entitlement?.referralsQualifiedCount || 0;
  const targetCount = 3;
  const progressRatio = Math.min(qualifiedCount / targetCount, 1);

  const handleCopy = async () => {
    if (!referralCode) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        await Share.share({
          message: `Join ReCiti with my invite code: ${referralCode} https://reciti.in/r/${referralCode}`,
        });
      }
    } catch {
      Alert.alert('Invite Code', referralCode);
    }
  };

  return (
    <View style={styles.container}>
      {/* Tier Progress: Your Climb */}
      <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionLabel}>
        YOUR CLIMB
      </Typography>
      <TierProgress userDoc={userDoc} />

      {/* Resident Pass Card */}
      <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionLabel}>
        RESIDENT PASS & CIVIC ACCESS
      </Typography>

      <View style={[styles.card, { backgroundColor: theme.bgColor, borderColor: theme.borderColor }]}>
        {/* Pass Header */}
        <View style={styles.passHeader}>
          <View style={[styles.passIconWrap, { backgroundColor: `${theme.accentColor}20` }]}>
            <Ionicons name={theme.iconName} size={20} color={theme.accentColor} />
          </View>
          <View style={styles.passHeaderText}>
            <View style={styles.titleRow}>
              <Typography variant="body" weight="bold" color={colors.text}>
                {theme.title}
              </Typography>
              <View style={[styles.badgePill, { backgroundColor: `${theme.accentColor}20` }]}>
                <Typography variant="caption" weight="bold" color={theme.accentColor} style={{ fontSize: 10 }}>
                  {theme.badgeLabel}
                </Typography>
              </View>
            </View>
            <Typography variant="caption" color={colors.textMuted} style={{ marginTop: 2, lineHeight: 16 }}>
              {theme.subtitle}
            </Typography>
          </View>
        </View>

        {/* Progress Bar (if not subscribed or unlocked via referrals) */}
        {!isUnlocked && (
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>
                UNLOCK PROGRESS
              </Typography>
              <Typography variant="caption" weight="bold" color={colors.primary} style={{ fontSize: 11 }}>
                {qualifiedCount} / {targetCount} friends joined
              </Typography>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.round(progressRatio * 100)}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Referral Code & Share Action */}
        {Boolean(referralCode) && (
          <View style={[styles.codeBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <AnimatedButton onPress={handleCopy} style={styles.codeTapArea} hapticFeedback="light">
              <View>
                <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 10 }}>
                  YOUR INVITE CODE
                </Typography>
                <View style={styles.codeTextRow}>
                  <Typography variant="body" weight="bold" color={colors.primary} style={{ letterSpacing: 1.5, marginTop: 1 }}>
                    {referralCode}
                  </Typography>
                </View>
              </View>
            </AnimatedButton>

            <AnimatedButton
              onPress={onShareReferral}
              style={[styles.shareBtn, { backgroundColor: colors.primary }]}
              hapticFeedback="medium"
            >
              <Ionicons name="share-social-outline" size={15} color="#FFFFFF" />
              <Typography variant="caption" weight="bold" color="#FFFFFF" style={{ marginLeft: 6 }}>
                Share Invite
              </Typography>
            </AnimatedButton>
          </View>
        )}

        {/* Upgrade / Get Resident Pass VIP Banner (if not already subscribed) */}
        {!isResidentPassVip && (
          <View style={[styles.vipUpgradeBox, { backgroundColor: colors.background, borderColor: colors.subscriptionBorder }]}>
            <View style={styles.vipUpgradeLeft}>
              <View style={[styles.vipMiniIcon, { backgroundColor: colors.subscriptionMuted }]}>
                <Ionicons name="ribbon" size={16} color={colors.subscription} />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Typography variant="caption" weight="bold" color={colors.text} style={{ fontSize: 12 }}>
                  {isUnlocked ? 'Upgrade to Resident Pass VIP' : 'Get Resident Pass'}
                </Typography>
                <Typography variant="caption" color={colors.textMuted} style={{ fontSize: 10, marginTop: 1 }}>
                  Zero Broker and verified direct owner contacts with location.
                </Typography>
              </View>
            </View>
            <AnimatedButton
              onPress={() => setPassModalVisible(true)}
              style={[styles.getPassBtn, { backgroundColor: colors.subscription }]}
              hapticFeedback="medium"
            >
              <Ionicons name="flash" size={13} color="#FFFFFF" />
              <Typography variant="caption" weight="bold" color="#FFFFFF" style={{ marginLeft: 4 }}>
                Get Pass
              </Typography>
            </AnimatedButton>
          </View>
        )}
      </View>

      {/* Resident Pass VIP Modal */}
      <ResidentPassModal
        visible={passModalVisible}
        onClose={() => setPassModalVisible(false)}
        isUnlockedViaReferral={provenance === 'referral'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  sectionLabel: {
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  passHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  passIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  passHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  progressSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#8882',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  codeTapArea: {
    flex: 1,
  },
  codeTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  vipUpgradeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  vipUpgradeLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  vipMiniIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getPassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
});
