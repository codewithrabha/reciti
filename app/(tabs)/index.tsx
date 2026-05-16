import React, { useState, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Report } from '@/types';
import { subscribeToReports, verifyReport, flagReport } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { ReportCard } from '@/components/ReportCard';
import { Typography } from '@/components/ui/Typography';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useTheme } from '@/theme';

type TabType = 'wins' | 'fails' | 'radar';
const TABS: TabType[] = ['wins', 'fails', 'radar'];

export default function HubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { colors, spacing, radii } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('wins');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let unsubscribe: () => void;

    if (activeTab === 'wins') {
      unsubscribe = subscribeToReports('verified', 'win', (data) => {
        setReports(data);
        setLoading(false);
      });
    } else if (activeTab === 'fails') {
      unsubscribe = subscribeToReports('verified', 'fail', (data) => {
        setReports(data);
        setLoading(false);
      });
    } else {
      unsubscribe = subscribeToReports('pending', null, (data) => {
        setReports(data.filter(r => r.reporterId !== user?.uid));
        setLoading(false);
      });
    }

    return () => { if (unsubscribe) unsubscribe(); };
  }, [activeTab, user?.uid]);

  const handleVerify = async (reportId: string) => {
    if (!user) return;
    await verifyReport(reportId, user.uid);
  };

  const handleFlag = async (reportId: string) => {
    if (!user) return;
    await flagReport(reportId, user.uid);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.md, paddingBottom: spacing.sm }]}>
        <Typography variant="h1" style={{ marginBottom: spacing.sm }}>The Hub</Typography>

        {/* Segmented Control */}
        <View style={[styles.segControl, { backgroundColor: colors.surface, borderRadius: radii.md }]}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <AnimatedButton
                key={tab}
                onPress={() => setActiveTab(tab)}
                hapticFeedback="light"
                style={[
                  styles.segBtn,
                  isActive && [styles.segBtnActive, { backgroundColor: colors.background, borderRadius: radii.sm }],
                ]}
              >
                <Typography variant="body" weight="semiBold" color={isActive ? colors.text : colors.textMuted}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Typography>
              </AnimatedButton>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="leaf-outline" size={80} color={colors.border} />
          <Typography variant="h3" color={colors.textMuted} style={{ marginTop: spacing.md, textAlign: 'center' }}>
            No reports found.
          </Typography>
          <Typography variant="body" color={colors.textMuted} style={{ marginTop: spacing.xs, textAlign: 'center' }}>
            {activeTab === 'radar'
              ? 'No pending reports near you to verify.'
              : 'Be the first to log something in your city!'}
          </Typography>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.reportId}
          renderItem={({ item }) => (
            <ReportCard
              report={item}
              isRadarView={activeTab === 'radar'}
              onVerify={() => handleVerify(item.reportId)}
              onFlag={() => handleFlag(item.reportId)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 120, paddingTop: spacing.sm }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {},
  segControl: {
    flexDirection: 'row',
    padding: 4,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
});
