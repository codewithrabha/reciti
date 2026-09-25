import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

interface ProfileQuickActionsProps {
  onShareInvite: () => void;
  onListProperty?: () => void;
  onHostEvent?: () => void;
}

export function ProfileQuickActions({
  onShareInvite,
  onListProperty,
  onHostEvent,
}: ProfileQuickActionsProps) {
  const { colors } = useTheme();

  const handleListProperty = () => {
    if (onListProperty) {
      onListProperty();
      return;
    }
    Alert.alert(
      'List a Space / Business',
      'Community listing portal is coming soon. You will be able to list vacant rooms, flats, PGs, or local shops directly.'
    );
  };

  const handleHostEvent = () => {
    if (onHostEvent) {
      onHostEvent();
      return;
    }
    Alert.alert(
      'Host a Community Event',
      'Public event submission is coming soon. You will be able to organize local cleanups, cultural gatherings, and sports tournaments.'
    );
  };

  return (
    <View style={styles.container}>
      <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionLabel}>
        QUICK ACTIONS
      </Typography>

      <View style={styles.actionsGrid}>
        {/* 1. List Space / Shop */}
        <AnimatedButton
          onPress={handleListProperty}
          style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          hapticFeedback="light"
        >
          <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="home-outline" size={18} color={colors.primary} />
          </View>
          <Typography variant="caption" weight="bold" color={colors.text} style={styles.actionTitle}>
            List Space
          </Typography>
          <Typography variant="caption" color={colors.textMuted} style={styles.actionSubtitle}>
            Rent / Shop
          </Typography>
        </AnimatedButton>

        {/* 2. Host Event */}
        <AnimatedButton
          onPress={handleHostEvent}
          style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          hapticFeedback="light"
        >
          <View style={[styles.iconCircle, { backgroundColor: '#8B5CF618' }]}>
            <Ionicons name="calendar-outline" size={18} color="#8B5CF6" />
          </View>
          <Typography variant="caption" weight="bold" color={colors.text} style={styles.actionTitle}>
            Host Event
          </Typography>
          <Typography variant="caption" color={colors.textMuted} style={styles.actionSubtitle}>
            Community
          </Typography>
        </AnimatedButton>

        {/* 3. Share Invite */}
        <AnimatedButton
          onPress={onShareInvite}
          style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          hapticFeedback="medium"
        >
          <View style={[styles.iconCircle, { backgroundColor: '#10B98118' }]}>
            <Ionicons name="share-social-outline" size={18} color="#10B981" />
          </View>
          <Typography variant="caption" weight="bold" color={colors.text} style={styles.actionTitle}>
            Share Invite
          </Typography>
          <Typography variant="caption" color={colors.textMuted} style={styles.actionSubtitle}>
            Earn 25 pts
          </Typography>
        </AnimatedButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 20,
  },
  sectionLabel: {
    letterSpacing: 1,
    marginBottom: 8,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionTitle: {
    textAlign: 'center',
    fontSize: 12,
  },
  actionSubtitle: {
    fontSize: 10,
    marginTop: 1,
    textAlign: 'center',
  },
});
