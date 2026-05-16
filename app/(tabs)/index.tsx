import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, Pressable,
  ActivityIndicator, StyleSheet, useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Report } from '@/types';
import { subscribeToReports, verifyReport, flagReport } from '@/lib/db';
import { useAuth } from '@/hooks/useAuth';
import { ReportCard } from '@/components/ReportCard';

type TabType = 'wins' | 'fails' | 'radar';

const TABS: TabType[] = ['wins', 'fails', 'radar'];

export default function HubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

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

  const bg = dark ? '#0f172a' : '#f8fafc';
  const cardBg = dark ? '#1e293b' : '#ffffff';
  const textPrimary = dark ? '#f1f5f9' : '#0f172a';
  const textMuted = dark ? '#94a3b8' : '#64748b';
  const segBg = dark ? '#1e293b' : '#f1f5f9';
  const activeSegBg = dark ? '#334155' : '#ffffff';

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: textPrimary }]}>The Hub</Text>

        {/* Segmented Control */}
        <View style={[styles.segControl, { backgroundColor: segBg }]}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.segBtn, isActive && [styles.segBtnActive, { backgroundColor: activeSegBg }]]}
              >
                <Text style={[styles.segText, { color: isActive ? textPrimary : textMuted }]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="leaf-outline" size={64} color="#cbd5e1" />
          <Text style={[styles.emptyTitle, { color: textMuted }]}>No reports found.</Text>
          <Text style={[styles.emptySubtitle, { color: textMuted }]}>
            {activeTab === 'radar'
              ? 'No pending reports near you to verify.'
              : 'Be the first to log something in your city!'}
          </Text>
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
              cardBg={cardBg}
              textPrimary={textPrimary}
              textMuted={textMuted}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/(tabs)/capture')}
        style={styles.fab}
      >
        <Ionicons name="add" size={32} color="white" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 12 },
  segControl: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  segBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segText: { fontWeight: '600', fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
