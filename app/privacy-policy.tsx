import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { LegalScreen } from '@/components/settings/LegalScreen';
import { useDynamicLegal } from '@/lib/legalService';
import { useTheme } from '@/theme';

export default function PrivacyPolicyScreen() {
  const { content, loading } = useDynamicLegal('legal_privacy');
  const { colors } = useTheme();

  if (loading && !content) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <LegalScreen
      title={content?.title || 'Privacy Policy'}
      lastUpdated={content?.lastUpdated || ''}
      intro={content?.intro}
      sections={content?.sections || []}
    />
  );
}
