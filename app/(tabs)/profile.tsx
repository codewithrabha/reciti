import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LegendList } from '@legendapp/list/react-native';

import { useUser, useUserDoc, useRefreshUserDoc } from '@/hooks/useAuth';
import { updateDisplayName } from '@/lib/auth';
import { getUserReports } from '@/lib/db';
import { getUserOwnedListings, getUserClaims } from '@/lib/directoryService';
import { getUserEvents } from '@/lib/eventService';
import { getReferralCodeForUser, shareReferral, subscribeUserEntitlement } from '@/lib/referralService';
import {
  BusinessDirectoryItem,
  CityEvent,
  ListingClaim,
  Report,
  ReportStatus,
  UserBookmark,
  UserEntitlement,
} from '@/types';
import { ResidentPassCard } from '@/components/profile/ResidentPassCard';
import { ProfileQuickActions } from '@/components/profile/ProfileQuickActions';
import { ActivitySegmentTabs, ActivityTabKey } from '@/components/profile/ActivitySegmentTabs';
import { ListingItemRow, UserListingItem } from '@/components/profile/ListingItemRow';
import { EventItemRow } from '@/components/profile/EventItemRow';
import { SavedItemRow } from '@/components/profile/SavedItemRow';
import { useBookmarkStore } from '@/store/bookmarkStore';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { StateView } from '@/components/ui/StateView';
import { Typography } from '@/components/ui/Typography';
import { MyReportRowSkeleton } from '@/components/skeletons';
import { useTheme } from '@/theme';

const GRADIENT = ['#34D399', '#10B981', '#059669'] as const;

/** Stable empty reference so the list doesn't see a new array each render. */
const NO_REPORTS: Report[] = [];

const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: 'Pending',
  verified: 'Verified',
  in_progress: 'In progress',
  resolved: 'Resolved',
  archived: 'Removed',
};

const STATUS_VARIANT: Record<ReportStatus, 'primary' | 'warning' | 'danger' | 'default'> = {
  pending: 'warning',
  verified: 'primary',
  in_progress: 'warning',
  resolved: 'primary',
  archived: 'danger',
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * A single "your reports" row. Memoized so the virtualized list can recycle
 * rows without re-rendering unchanged items. `isFirst`/`isLast` round the ends
 * so the list still reads as one joined card.
 */
const ReportRow = React.memo(function ReportRow({
  report,
  isFirst,
  isLast,
}: {
  report: Report;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const { colors, radii } = useTheme();
  return (
    <AnimatedButton
      onPress={() =>
        router.push({ pathname: '/report/[id]', params: { id: report.reportId } })
      }
      hapticFeedback="light"
      scaleTo={0.99}
      style={[
        styles.reportRow,
        { backgroundColor: colors.surface },
        isFirst && { borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
        isLast && { borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg },
        !isFirst && { borderTopColor: colors.border, borderTopWidth: 1 },
      ]}
    >
      <View
        style={[
          styles.vibeDot,
          { backgroundColor: report.vibe === 'win' ? colors.primary : colors.danger },
        ]}
      />
      <View style={styles.reportInfo}>
        <Typography variant="body" weight="semiBold">
          {cap(report.category)} {report.vibe === 'win' ? 'win' : 'issue'}
        </Typography>
        <Typography variant="caption" color={colors.textMuted}>
          {report.city ? `${report.city} · ` : ''}
          {report.createdAt.toDate().toLocaleDateString()}
        </Typography>
      </View>
      <Badge label={STATUS_LABEL[report.status]} variant={STATUS_VARIANT[report.status]} />
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </AnimatedButton>
  );
});

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useUser();
  const userDoc = useUserDoc();
  const refreshUserDoc = useRefreshUserDoc();
  const { colors, spacing, radii } = useTheme();

  const [activeTab, setActiveTab] = useState<ActivityTabKey>('reports');
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [myListings, setMyListings] = useState<BusinessDirectoryItem[]>([]);
  const [myClaims, setMyClaims] = useState<ListingClaim[]>([]);
  const [myEvents, setMyEvents] = useState<CityEvent[]>([]);
  const savedItems = useBookmarkStore((s) => s.savedItems);
  const [savedFilter, setSavedFilter] = useState<'all' | 'directory' | 'housing' | 'event'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [entitlement, setEntitlement] = useState<UserEntitlement | null>(null);

  // Subscribe to user entitlement for referral stats
  React.useEffect(() => {
    if (!user || user.isAnonymous) return;
    const unsub = subscribeUserEntitlement(user.uid, (ent) => {
      setEntitlement(ent);
    });
    return () => unsub();
  }, [user?.uid]);

  const referralCode = user && !user.isAnonymous ? getReferralCodeForUser(user.uid) : '';

  const handleShareCivicReferral = async () => {
    if (!referralCode) return;
    try {
      await shareReferral(referralCode, 'general_civic');
    } catch (err) {
      console.error('Error sharing referral:', err);
    }
  };

  const loadData = useCallback(async () => {
    if (!user || user.isAnonymous) return;
    setLoading(true);
    setError(false);
    try {
      const [reports, ownedListings, claims, events] = await Promise.all([
        getUserReports(user.uid),
        getUserOwnedListings(user.uid),
        getUserClaims(user.uid),
        getUserEvents(user.uid),
        useBookmarkStore.getState().loadSavedItems(user.uid),
      ]);
      setMyReports(reports);
      setMyListings(ownedListings);
      setMyClaims(claims);
      setMyEvents(events);
    } catch (err) {
      console.warn('[profile] loadData error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(), refreshUserDoc()]);
    setRefreshing(false);
  }, [loadData, refreshUserDoc]);


  const openNameEditor = () => {
    setNameDraft(userDoc?.displayName ?? user?.displayName ?? '');
    setEditingName(true);
  };

  const cancelNameEditor = () => {
    if (savingName) return;
    setEditingName(false);
  };

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Display name cannot be empty.');
      return;
    }
    if (trimmed.length > 30) {
      Alert.alert('Too long', 'Display name must be 30 characters or fewer.');
      return;
    }
    setSavingName(true);
    try {
      await updateDisplayName(trimmed);
      await refreshUserDoc();
      setEditingName(false);
    } catch {
      Alert.alert('Error', "Couldn't update your name. Please try again.");
    } finally {
      setSavingName(false);
    }
  };

  /* ----------------------------- guest state ----------------------------- */

  if (!user || user.isAnonymous) {
    return (
      <View style={[styles.container, styles.anon, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <LinearGradient
          colors={GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.anonOrb}
        >
          <Ionicons name="trophy" size={52} color="#FFFFFF" />
        </LinearGradient>
        <Typography variant="h1" align="center" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
          Join the movement
        </Typography>
        <Typography
          variant="body"
          color={colors.textMuted}
          align="center"
          style={{ marginBottom: spacing.xl }}
        >
          Create an account to submit reports, earn Civic Points, and climb from
          Tourist to Guardian.
        </Typography>

        <AnimatedButton
          style={{ width: '100%', marginBottom: spacing.sm }}
          onPress={() => router.push('/auth/login')}
          hapticFeedback="medium"
        >
          <LinearGradient
            colors={['#34D399', '#059669']}
            style={styles.primaryBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
            <Typography variant="body" weight="bold" color="#FFFFFF">
              Create account
            </Typography>
          </LinearGradient>
        </AnimatedButton>
        <AnimatedButton
          style={[styles.secondaryBtn, { borderColor: colors.border, borderRadius: radii.md }]}
          onPress={() => router.push('/auth/login')}
          hapticFeedback="light"
        >
          <Typography variant="body" weight="bold">
            Sign in
          </Typography>
        </AnimatedButton>
      </View>
    );
  }

  /* --------------------------- authenticated ----------------------------- */

  const name = userDoc?.displayName ?? user.displayName ?? 'Citizen';

  // Combined list of verified owned directories and submitted claims
  const combinedListings: UserListingItem[] = React.useMemo(() => {
    const owned: UserListingItem[] = myListings.map((l) => ({ type: 'owned', listing: l }));
    const ownedIds = new Set(myListings.map((l) => l.id));
    const claims: UserListingItem[] = myClaims
      .filter((c) => !ownedIds.has(c.listingId))
      .map((c) => ({ type: 'claim', claim: c }));
    return [...owned, ...claims];
  }, [myListings, myClaims]);

  const filteredSavedItems = React.useMemo(() => {
    if (savedFilter === 'all') return savedItems;
    return savedItems.filter((item) => item.itemType === savedFilter);
  }, [savedItems, savedFilter]);

  // Current active data based on selected segment
  const activeData: any[] = React.useMemo(() => {
    if (error) return NO_REPORTS;
    if (activeTab === 'reports') return myReports;
    if (activeTab === 'listings') return combinedListings;
    if (activeTab === 'events') return myEvents;
    return filteredSavedItems;
  }, [error, activeTab, myReports, combinedListings, myEvents, filteredSavedItems]);

  // Everything above the active list scrolls with the list as its header
  const listHeader = (
    <>
      {/* Resident Pass & Civic Membership */}
      <ResidentPassCard
        entitlement={entitlement}
        referralCode={referralCode}
        userDoc={userDoc}
        onShareReferral={handleShareCivicReferral}
      />

      {/* Quick Actions (List Space, Host Event, Share Invite) */}
      <ProfileQuickActions
        onShareInvite={handleShareCivicReferral}
      />

      {/* Activity Segment Tabs */}
      <ActivitySegmentTabs
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        reportsCount={myReports.length}
        listingsCount={combinedListings.length}
        eventsCount={myEvents.length}
        savedCount={savedItems.length}
      />

      {/* Saved Filter Pills (shown only on Saved tab) */}
      {activeTab === 'saved' && (
        <View style={styles.savedFilterRow}>
          {[
            { key: 'all', label: 'All' },
            { key: 'directory', label: 'Places' },
            { key: 'housing', label: 'Rentals' },
            { key: 'event', label: 'Events' },
          ].map((pill) => {
            const isSelected = savedFilter === pill.key;
            return (
              <AnimatedButton
                key={pill.key}
                onPress={() => setSavedFilter(pill.key as any)}
                hapticFeedback="light"
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Typography
                  variant="caption"
                  weight={isSelected ? 'bold' : 'medium'}
                  color={isSelected ? '#FFFFFF' : colors.textMuted}
                  style={{ fontSize: 11 }}
                >
                  {pill.label}
                </Typography>
              </AnimatedButton>
            );
          })}
        </View>
      )}

      {error && (
        <View style={styles.errorWrap}>
          <StateView
            icon="cloud-offline"
            tone="error"
            title="Couldn’t load your profile"
            message="Something went wrong. Check your connection and try again."
            actionLabel="Retry"
            onAction={loadData}
          />
        </View>
      )}
    </>
  );

  // Dynamic empty state per tab
  const listEmpty = error ? null : loading ? (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
      <MyReportRowSkeleton count={3} />
    </Animated.View>
  ) : (
    <Card padding="none">
      <StateView
        compact
        icon={
          activeTab === 'reports'
            ? 'camera-outline'
            : activeTab === 'listings'
            ? 'business-outline'
            : activeTab === 'events'
            ? 'sparkles-outline'
            : 'bookmark-outline'
        }
        title={
          activeTab === 'reports'
            ? 'No reports yet'
            : activeTab === 'listings'
            ? 'No listings or claims'
            : activeTab === 'events'
            ? 'No hosted events'
            : 'No saved items yet'
        }
        message={
          activeTab === 'reports'
            ? "You haven't submitted any reports yet. Capture your first one."
            : activeTab === 'listings'
            ? 'You have not registered or claimed any rental spaces, shops, or businesses yet.'
            : activeTab === 'events'
            ? "You haven't organized any civic or community gatherings yet."
            : 'Bookmark verified places, rentals, or events across your city to quickly find them here.'
        }
      />
    </Card>
  );

  const keyExtractor = useCallback(
    (item: any) => {
      if (activeTab === 'reports') return item.reportId;
      if (activeTab === 'listings') {
        return item.type === 'owned' ? `owned_${item.listing.id}` : `claim_${item.claim.claimId}`;
      }
      if (activeTab === 'events') return `event_${item.id}`;
      return `saved_${item.targetId}`;
    },
    [activeTab],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      if (activeTab === 'reports') {
        return (
          <ReportRow
            report={item as Report}
            isFirst={index === 0}
            isLast={index === activeData.length - 1}
          />
        );
      }
      if (activeTab === 'listings') {
        return (
          <ListingItemRow
            item={item as UserListingItem}
            isFirst={index === 0}
            isLast={index === activeData.length - 1}
          />
        );
      }
      if (activeTab === 'events') {
        return (
          <EventItemRow
            event={item as CityEvent}
            isFirst={index === 0}
            isLast={index === activeData.length - 1}
          />
        );
      }
      return (
        <SavedItemRow
          bookmark={item as UserBookmark}
          isFirst={index === 0}
          isLast={index === activeData.length - 1}
        />
      );
    },
    [activeTab, activeData.length],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={styles.header}>
          {user.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.primary }]}>
              <Typography variant="h2" weight="bold" color="#FFFFFF">
                {name.charAt(0).toUpperCase()}
              </Typography>
            </View>
          )}
          <View style={styles.headerText}>
            <AnimatedButton
              onPress={openNameEditor}
              hapticFeedback="light"
              scaleTo={0.98}
              style={styles.nameRow}
            >
              <Typography variant="h3" weight="bold" numberOfLines={1} style={styles.nameText}>
                {name}
              </Typography>
              <Ionicons name="pencil" size={14} color={colors.textMuted} />
            </AnimatedButton>
            {!!user.email && (
              <Typography variant="caption" color={colors.textMuted} numberOfLines={1}>
                {user.email}
              </Typography>
            )}
          </View>
          <AnimatedButton
            onPress={() => router.push('/settings')}
            hapticFeedback="light"
            style={styles.iconBtn}
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={24} color={colors.textMuted} />
          </AnimatedButton>
        </View>
      </View>

      <LegendList
        data={activeData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={64}
        recycleItems
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />

      <Modal
        transparent
        visible={editingName}
        animationType="fade"
        onRequestClose={cancelNameEditor}
      >
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <Card style={styles.modalCard} padding="lg">
            <View style={styles.modalHeader}>
              <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
              <Typography variant="h3" weight="bold" style={styles.modalTitle}>
                Edit display name
              </Typography>
            </View>
            <TextInput
              value={nameDraft}
              onChangeText={(t) => setNameDraft(t.slice(0, 30))}
              placeholder="Your display name"
              placeholderTextColor={colors.textMuted}
              maxLength={30}
              autoFocus
              editable={!savingName}
              style={[
                styles.nameInput,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  borderRadius: radii.md,
                  color: colors.text,
                },
              ]}
            />
            <Typography
              variant="caption"
              color={colors.textMuted}
              style={styles.modalCounter}
            >
              {nameDraft.length}/30
            </Typography>
            <View style={styles.modalActions}>
              <AnimatedButton
                onPress={cancelNameEditor}
                hapticFeedback="light"
                disabled={savingName}
                style={[
                  styles.modalBtn,
                  { borderColor: colors.border, borderWidth: 1.5, borderRadius: radii.md },
                ]}
              >
                <Typography variant="body" weight="semiBold">
                  Cancel
                </Typography>
              </AnimatedButton>
              <AnimatedButton
                onPress={saveName}
                hapticFeedback="medium"
                disabled={savingName || !nameDraft.trim()}
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor:
                      savingName || !nameDraft.trim() ? colors.border : colors.primary,
                    borderRadius: radii.md,
                  },
                ]}
              >
                {savingName ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Typography variant="body" weight="bold" color="#FFFFFF">
                    Save
                  </Typography>
                )}
              </AnimatedButton>
            </View>
          </Card>
        </BlurView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 120 },

  // Guest
  anon: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  anonOrb: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
  },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameText: { flexShrink: 1 },
  iconBtn: { padding: 8 },

  // Edit-name modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: { width: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalTitle: { flex: 1 },
  nameInput: {
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
    fontSize: 16,
  },
  modalCounter: { marginTop: 6, textAlign: 'right' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sections
  sectionLabel: { letterSpacing: 1, marginTop: 24, marginBottom: 10 },
  loading: { paddingVertical: 32, alignItems: 'center' },

  // Sections
  errorWrap: { marginTop: 24 },
  // Reports
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  vibeDot: { width: 10, height: 10, borderRadius: 5 },
  reportInfo: { flex: 1, gap: 1 },
  // Saved filters
  savedFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
});
