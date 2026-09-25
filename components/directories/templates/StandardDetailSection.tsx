import React from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CategorySectionProps } from './types';
import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

export function StandardDetailSection({ business }: CategorySectionProps) {
  const { colors, spacing } = useTheme();

  const handleCall = () => {
    if (!business.phone) return;
    Linking.openURL(`tel:${business.phone}`);
  };

  const handleDirections = () => {
    if (business.googleBusinessUrl) {
      Linking.openURL(business.googleBusinessUrl);
      return;
    }
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
    if (!business.website) return;
    Linking.openURL(business.website);
  };

  return (
    <View style={styles.container}>
      {/* Address & Hours */}
      <View style={[styles.infoBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={18} color={colors.primary} />
          <Typography variant="body" color={colors.text} style={{ flex: 1, marginLeft: spacing.sm }}>
            {business.address}
            {business.city ? `, ${business.city}` : ''}
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
        {business.phone ? (
          <AnimatedButton
            onPress={handleCall}
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="call-outline" size={20} color={colors.primary} />
            <Typography variant="caption" weight="semiBold" style={{ marginTop: 4 }}>
              Call
            </Typography>
          </AnimatedButton>
        ) : null}

        <AnimatedButton
          onPress={handleDirections}
          style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="navigate-outline" size={20} color={colors.primary} />
          <Typography variant="caption" weight="semiBold" style={{ marginTop: 4 }}>
            Directions
          </Typography>
        </AnimatedButton>

        {business.website ? (
          <AnimatedButton
            onPress={handleWebsite}
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="globe-outline" size={20} color={colors.primary} />
            <Typography variant="caption" weight="semiBold" style={{ marginTop: 4 }}>
              Website
            </Typography>
          </AnimatedButton>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
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
});
