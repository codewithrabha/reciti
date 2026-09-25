import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

export type ActivityTabKey = 'reports' | 'listings' | 'events';

interface ActivitySegmentTabsProps {
  activeTab: ActivityTabKey;
  onSelectTab: (tab: ActivityTabKey) => void;
  reportsCount: number;
  listingsCount: number;
  eventsCount: number;
}

export function ActivitySegmentTabs({
  activeTab,
  onSelectTab,
  reportsCount,
  listingsCount,
  eventsCount,
}: ActivitySegmentTabsProps) {
  const { colors } = useTheme();

  const tabs: { key: ActivityTabKey; label: string; count: number; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'reports', label: 'Reports', count: reportsCount, icon: 'document-text-outline' },
    { key: 'listings', label: 'Listings', count: listingsCount, icon: 'home-outline' },
    { key: 'events', label: 'Events', count: eventsCount, icon: 'sparkles-outline' },
  ];

  return (
    <View style={styles.container}>
      <Typography variant="caption" weight="bold" color={colors.textMuted} style={styles.sectionLabel}>
        MY CIVIC ACTIVITY
      </Typography>

      <View style={[styles.tabsTrack, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <AnimatedButton
              key={tab.key}
              onPress={() => onSelectTab(tab.key)}
              hapticFeedback="light"
              style={[
                styles.tabBtn,
                isActive && [styles.tabBtnActive, { backgroundColor: colors.primary }],
              ]}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={isActive ? '#FFFFFF' : colors.textMuted}
                style={{ marginRight: 4 }}
              />
              <Typography
                variant="caption"
                weight={isActive ? 'bold' : 'semiBold'}
                color={isActive ? '#FFFFFF' : colors.textMuted}
                style={{ fontSize: 11 }}
              >
                {tab.label}
              </Typography>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: isActive ? '#FFFFFF30' : `${colors.textMuted}20` },
                ]}
              >
                <Typography
                  variant="caption"
                  weight="bold"
                  color={isActive ? '#FFFFFF' : colors.textMuted}
                  style={{ fontSize: 10 }}
                >
                  {tab.count}
                </Typography>
              </View>
            </AnimatedButton>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 24,
    marginBottom: 10,
  },
  sectionLabel: {
    letterSpacing: 1,
    marginBottom: 8,
  },
  tabsTrack: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  countBadge: {
    marginLeft: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
  },
});
