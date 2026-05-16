import React from 'react';
import {
  View, Text, Image, Pressable, StyleSheet,
} from 'react-native';
import { Report } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

interface ReportCardProps {
  report: Report;
  onVerify?: () => void;
  onFlag?: () => void;
  isRadarView?: boolean;
  cardBg?: string;
  textPrimary?: string;
  textMuted?: string;
}

export function ReportCard({
  report, onVerify, onFlag, isRadarView = false,
  cardBg = '#ffffff', textPrimary = '#0f172a', textMuted = '#64748b',
}: ReportCardProps) {
  const isWin = report.vibe === 'win';

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.iconBadge, { backgroundColor: isWin ? '#d1fae5' : '#ffe4e6' }]}>
            <Ionicons
              name={isWin ? 'leaf' : 'warning'}
              size={16}
              color={isWin ? '#10b981' : '#f43f5e'}
            />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={[styles.cardCategory, { color: textPrimary }]}>
              {report.category.charAt(0).toUpperCase() + report.category.slice(1)} {isWin ? 'Win' : 'Issue'}
            </Text>
            <Text style={[styles.cardTime, { color: textMuted }]}>
              {formatDistanceToNow(report.createdAt.toDate(), { addSuffix: true })}
            </Text>
          </View>
        </View>
        <View style={[styles.vibeBadge, { backgroundColor: isWin ? '#ecfdf5' : '#fff1f2' }]}>
          <Text style={[styles.vibeText, { color: isWin ? '#10b981' : '#f43f5e' }]}>
            {isWin ? '+ Civic Win' : '- Civic Fail'}
          </Text>
        </View>
      </View>

      {/* Image */}
      {report.imageUrl ? (
        <Image source={{ uri: report.imageUrl }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.cardImagePlaceholder, { backgroundColor: '#f1f5f9' }]}>
          <Ionicons name="image-outline" size={32} color="#94a3b8" />
        </View>
      )}

      {/* Radar Actions */}
      {isRadarView && report.status === 'pending' && (
        <View style={styles.actions}>
          <Pressable onPress={onVerify} style={[styles.actionBtn, styles.actionBtnLeft]}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
            <Text style={[styles.actionText, { color: '#10b981' }]}>
              Verify ({report.verifiedBy.length}/3)
            </Text>
          </Pressable>
          <Pressable onPress={onFlag} style={styles.actionBtn}>
            <Ionicons name="flag-outline" size={20} color="#f43f5e" />
            <Text style={[styles.actionText, { color: '#f43f5e' }]}>Flag</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBadge: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  cardCategory: { fontWeight: '600', fontSize: 14 },
  cardTime: { fontSize: 12, marginTop: 2 },
  vibeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  vibeText: { fontSize: 11, fontWeight: '600' },
  cardImage: { width: '100%', height: 192 },
  cardImagePlaceholder: {
    width: '100%', height: 192, alignItems: 'center', justifyContent: 'center',
  },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  actionBtn: {
    flex: 1, paddingVertical: 12, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnLeft: { borderRightWidth: 1, borderRightColor: '#f1f5f9' },
  actionText: { marginLeft: 6, fontWeight: '600', fontSize: 14 },
});
