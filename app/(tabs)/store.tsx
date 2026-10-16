import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/theme";
import { Typography } from "@/components/ui/Typography";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Card } from "@/components/ui/Card";
import { useLocationStore } from "@/store/locationStore";
import { useUser, useUserDoc } from "@/hooks/useAuth";
import { useWaitlistStatus } from "@/lib/waitlistService";
import { useUserApplication } from "@/lib/applicationService";
import { StoreSellerPayload } from "@/types";
import { StoreSellerApplicationModal } from "@/components/store/StoreSellerApplicationModal";

interface PreviewCategory {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const PREVIEW_CATEGORIES: PreviewCategory[] = [
  {
    id: "handcrafted",
    name: "Artisan & Handcrafted",
    description:
      "Unique decor, pottery, and textile goods crafted by local artists.",
    icon: "color-palette-outline",
    color: "#8B5CF6",
  },
  {
    id: "farm-fresh",
    name: "Farm Fresh & Organic",
    description:
      "Seasonal produce and pantry staples directly from local growers.",
    icon: "nutrition-outline",
    color: "#10B981",
  },
  {
    id: "eco-living",
    name: "Eco & Zero-Waste",
    description:
      "Sustainable goods, refills, and planet-positive daily essentials.",
    icon: "leaf-outline",
    color: "#06B6D4",
  },
  {
    id: "local-delights",
    name: "Gourmet & Delights",
    description:
      "Artisan roasts, honey, jams, and neighborhood baked specialties.",
    icon: "cafe-outline",
    color: "#F59E0B",
  },
  {
    id: "books-craft",
    name: "Books & Indie Press",
    description:
      "Local authors, independent zines, and neighborhood book exchanges.",
    icon: "book-outline",
    color: "#EC4899",
  },
  {
    id: "home-living",
    name: "Home & Living",
    description: "Plants, ceramics, and sustainable home enhancements.",
    icon: "home-outline",
    color: "#3B82F6",
  },
];

export default function StoreTabScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const cityName = useLocationStore((s) => s.cityName);
  const user = useUser();
  const userDoc = useUserDoc();

  // Unified Waitlist Engine for 'store_launch'
  const {
    isSubscribed,
    toggleSubscription,
  } = useWaitlistStatus(
    "store_launch",
    "ReCiti City Store",
    user?.uid,
    user?.email,
    userDoc?.displayName || user?.displayName,
    cityName || "Local Hub"
  );

  // Unified Applications Engine for 'store_seller'
  const { application, hasApplied } = useUserApplication<StoreSellerPayload>(
    "store_seller",
    user?.uid
  );
  const [sellerModalVisible, setSellerModalVisible] = useState(false);

  const handleNotifyToggle = async () => {
    try {
      const newlySubscribed = await toggleSubscription();
      if (newlySubscribed) {
        Alert.alert(
          "VIP Early Access Reserved",
          `You will be among the first citizens in ${cityName || "your city"} to receive an exclusive invitation and opening-day perks!`,
          [{ text: "Awesome" }]
        );
      }
    } catch (err: any) {
      Alert.alert("Notice", err?.message || "Failed to update notification preference.");
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <View style={styles.titleRow}>
              <Typography variant="h1">City Store</Typography>
            </View>
            <Typography
              variant="body"
              color={colors.textMuted}
              style={{ marginTop: 2 }}
            >
              Hyperlocal goods directly from neighborhood makers and independent
              stores.
            </Typography>
            <View style={styles.titleRow}>
              <View
                style={[
                  styles.cityChip,
                  {
                    backgroundColor: colors.primary + "18",
                    borderColor: colors.primary + "35",
                  },
                ]}
              >
                <Ionicons name="map-outline" size={12} color={colors.primary} />
                <Typography
                  variant="caption"
                  weight="bold"
                  color={colors.primary}
                  style={{ marginLeft: 3 }}
                >
                  {cityName || "Local Hub"}
                </Typography>
              </View>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 }]}
        overScrollMode="never"
      >
        {/* Hero Teaser Banner */}
        <Card
          variant="elevated"
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.badgePill,
              { backgroundColor: colors.primary + "20" },
            ]}
          >
            <View
              style={[styles.pulsingDot, { backgroundColor: colors.primary }]}
            />
            <Typography variant="caption" weight="bold" color={colors.primary}>
              COMING SOON
            </Typography>
          </View>

          <View style={styles.heroHeadingRow}>
            <View style={styles.heroIconCircle}>
              <Ionicons name="bag-handle" size={32} color={colors.primary} />
            </View>

            <Typography variant="h2" style={styles.heroTitle}>
              Shop Regional \ Empower Local
            </Typography>
          </View>


          <Typography
            variant="body"
            align="center"
            color={colors.textMuted}
            style={styles.heroDescription}
          >
            We are curating the finest neighborhood makers, sustainable growers,
            and independent shops in{" "}
            <Typography variant="body" weight="bold" color={colors.text}>
              {cityName || "your community"}
            </Typography>
            . Direct commerce with zero middleman markups.
          </Typography>

          {/* Early Access Action */}
          <AnimatedButton
            onPress={handleNotifyToggle}
            hapticFeedback="medium"
            style={[
              styles.notifyButton,
              {
                backgroundColor: isSubscribed
                  ? colors.primary + "18"
                  : colors.primary,
                borderColor: colors.primary,
              },
            ]}
          >
            <Ionicons
              name={isSubscribed ? "checkmark-circle" : "notifications-outline"}
              size={18}
              color={isSubscribed ? colors.primary : "#FFFFFF"}
              style={{ marginRight: 8 }}
            />
            <Typography
              variant="label"
              weight="bold"
              color={isSubscribed ? colors.primary : "#FFFFFF"}
            >
              {isSubscribed
                ? "You're on the Launch List!"
                : "Notify Me at Launch"}
            </Typography>
          </AnimatedButton>
        </Card>

        {/* Sneak Peek Categories Section */}
        <View style={styles.sectionHeader}>
          <Typography variant="h2">What's in Store</Typography>
          <Typography variant="caption" color={colors.textMuted}>
            Categories in curation
          </Typography>
        </View>

        <View style={styles.categoryGrid}>
          {PREVIEW_CATEGORIES.map((cat) => (
            <View
              key={cat.id}
              style={[
                styles.categoryCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.categoryIconWrap,
                  { backgroundColor: cat.color + "15" },
                ]}
              >
                <Ionicons name={cat.icon} size={22} color={cat.color} />
              </View>
              <Typography
                variant="subtitle"
                weight="bold"
                style={styles.categoryTitle}
              >
                {cat.name}
              </Typography>
              <Typography
                variant="caption"
                color={colors.textMuted}
                numberOfLines={2}
                style={styles.categoryDesc}
              >
                {cat.description}
              </Typography>
            </View>
          ))}
        </View>

        {/* Merchant Call-to-Action Card */}
        <Card
          variant="outlined"
          style={[
            styles.merchantCard,
            {
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.merchantHeader}>
            <View
              style={[
                styles.merchantIconWrap,
                { backgroundColor: "#F59E0B20" },
              ]}
            >
              <Ionicons name="storefront-outline" size={24} color="#F59E0B" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Typography variant="h3">Sell on ReCiti</Typography>
              <Typography variant="caption" color={colors.textMuted}>
                Are you a local goods producer, artisan, or shop owner?
              </Typography>
            </View>
          </View>

          <Typography
            variant="body"
            color={colors.textMuted}
            style={{ marginTop: 10 }}
          >
            Join our Founding Merchant program. Enjoy 0% commission for the
            first 6 months, verified city badges, and direct delivery
            integration.
          </Typography>

          {hasApplied && (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor:
                    application?.status === "approved" ? "#10B981" : "#F59E0B",
                  marginRight: 6,
                }}
              />
              <Typography
                variant="caption"
                weight="bold"
                color={
                  application?.status === "approved" ? "#10B981" : "#F59E0B"
                }
              >
                Application {application?.status === "approved" ? "Approved" : "Pending Review"}
              </Typography>
            </View>
          )}

          <AnimatedButton
            onPress={() => setSellerModalVisible(true)}
            hapticFeedback="light"
            style={[
              styles.merchantButton,
              { borderColor: colors.primary, backgroundColor: colors.surface },
            ]}
          >
            <Typography variant="label" weight="bold" color={colors.primary}>
              {hasApplied ? "View Application Status" : "Apply Now"}
            </Typography>
          </AnimatedButton>
        </Card>
      </ScrollView>

      {/* Founding Merchant Application & Status Modal */}
      <StoreSellerApplicationModal
        visible={sellerModalVisible}
        cityName={cityName || "Local Hub"}
        onClose={() => setSellerModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cityChip: {
    width: "auto",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 24,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 16,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  heroHeadingRow: {
    alignSelf: 'center',
    width: "100%",
    gap: 14,
    marginBottom: 14,
  },
  heroIconCircle: {
    width: 82,
    height: 82,
    borderRadius: 100,
    backgroundColor: "#10B98115",
    alignItems: "center",
    justifyContent: "center",
        alignSelf: 'center',
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "medium",
    flex: 1,
  },
  heroDescription: {
    lineHeight: 20,
    marginBottom: 20,
  },
  notifyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    width: "100%",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  categoryCard: {
    width: "48%",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  categoryDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  merchantCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  merchantHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  merchantIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  merchantButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
});
