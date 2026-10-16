import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/theme";
import { Typography } from "@/components/ui/Typography";
import { ServiceCategoryMeta } from "@/lib/serviceTaxonomyService";

const DEFAULT_CATEGORY_IMAGE =
  "https://res.cloudinary.com/dynqqhmeo/image/upload/v1792051076/reciti-logo_w9lp2f.svg";

interface LinkedServiceCategoryShelfProps {
  categories: ServiceCategoryMeta[];
  directoryLabel?: string;
}

export function LinkedServiceCategoryShelf({
  categories,
  directoryLabel,
}: LinkedServiceCategoryShelfProps) {
  const router = useRouter();
  const { colors } = useTheme();

  // If no service categories are linked, collapse with zero footprint
  if (!categories || categories.length === 0) {
    return null;
  }

  // Horizontal Scrollable Logic:
  // If > 5 categories, show top 5 + 1 "+count More" card.
  // If <= 5 categories, show all of them + 1 "Explore All" card.
  const hasMore = categories.length > 5;
  const displayedCategories = hasMore ? categories.slice(0, 5) : categories;
  const remainingCount = categories.length - 5;
  const showMoreCard = true; // The last slot redirects to the services marketplace

  const handleNavigateToCategory = (catKey: string) => {
    router.push({
      pathname: "/services/category/[slug]" as any,
      params: { slug: catKey },
    });
  };

  const handleNavigateToMarketplace = () => {
    router.push("/services" as any);
  };

  return (
    <View style={styles.container}>
      {/* Shelf Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View
            style={{ flex: 1, flexDirection: "row", alignItems: 'center', gap: 8 }}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <Ionicons
                name={(categories[0].icon || "apps-outline") as any}
                size={16}
                color={colors.primary}
              />
            </View>
            <View>
              <Typography
                variant="h3"
                style={{ fontSize: 16, fontWeight: "800" }}
              >
                Related Services
              </Typography>
              <Typography
                variant="caption"
                color={colors.textMuted}
                style={{ marginTop: 1, fontSize: 11 }}
              >
                Discover services available in your area.
              </Typography>
            </View>
          </View>
        </View>
      </View>

      {/* Horizontal Scrollable Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        overScrollMode="never"
      >
        {displayedCategories.map((cat) => {
          const subcatCount = cat.subcategories?.length || 0;
          const badgeText =
            subcatCount === 0
              ? "Coming Soon"
              : cat.badgeText?.trim() || "Explore";
          const imageUri = cat.imageUrl || DEFAULT_CATEGORY_IMAGE;

          return (
            <Pressable
              key={cat.key}
              onPress={() => handleNavigateToCategory(cat.key)}
              style={({ pressed }) => [
                styles.categoryCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: "transparent",
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Image
                source={{ uri: imageUri }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                transition={200}
              />
              <LinearGradient
                colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.76)"]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.cardContentOverlay}>
                <Typography
                  variant="caption"
                  numberOfLines={1}
                  style={{
                    fontSize: 11.5,
                    fontWeight: "800",
                    lineHeight: 15,
                    textAlign: "center",
                    color: "#FFFFFF",
                    textShadowColor: "rgba(0, 0, 0, 0.9)",
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 3,
                  }}
                >
                  {cat.label}
                </Typography>

                <Typography
                  variant="caption"
                  style={{
                    fontSize: 9.5,
                    marginTop: 3,
                    textAlign: "center",
                    color: "rgba(255,255,255,0.9)",
                    fontWeight: "700",
                    textShadowColor: "rgba(0, 0, 0, 0.9)",
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  }}
                  numberOfLines={1}
                >
                  {badgeText}
                </Typography>
              </View>
            </Pressable>
          );
        })}

        {/* Last Slot: +Count More / Explore All Card -> Redirects to Services Marketplace */}
        {showMoreCard && (
          <Pressable
            onPress={handleNavigateToMarketplace}
            style={({ pressed }) => [
              styles.moreCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primary + "40",
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View
              style={[
                styles.moreIconCircle,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <Ionicons name="apps" size={16} color={colors.primary} />
            </View>

            <Typography
              variant="caption"
              numberOfLines={1}
              style={{
                color: colors.primary,
                fontSize: 12,
                fontWeight: "800",
                marginTop: 4,
              }}
            >
              {remainingCount > 0 ? `+${remainingCount}` : "All"}
               {remainingCount > 0 ? "More" : "Services"}
            </Typography>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  scrollContainer: {
    marginHorizontal: -16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryCard: {
    width: 95,
    height: 95,
    borderRadius: 100,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    overflow: "hidden",
  },
  cardContentOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  moreCard: {
    width: 95,
    height: 95,
    borderRadius: 100,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  moreIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
