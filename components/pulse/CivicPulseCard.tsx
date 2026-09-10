import React, { useState } from "react";
import { Share, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";

import { Report } from "@/types";
import { useUser } from "@/hooks/useAuth";
import { toggleUpvoteReport } from "@/lib/db";
import { useTheme } from "@/theme";
import { Typography } from "@/components/ui/Typography";
import { Badge } from "@/components/ui/Badge";
import { AnimatedButton } from "@/components/ui/AnimatedButton";

interface CivicPulseCardProps {
  report: Report;
  onPress: () => void;
  onUpvote?: () => void;
  isUpvoted?: boolean;
}

export function CivicPulseCard({
  report,
  onPress,
  onUpvote,
  isUpvoted: propIsUpvoted,
}: CivicPulseCardProps) {
  const { colors, spacing } = useTheme();
  const user = useUser();
  const isWin = report.vibe === "win";

  const [isUpvoted, setIsUpvoted] = useState(
    propIsUpvoted ??
      (user ? (report.upvotedBy?.includes(user.uid) ?? false) : false),
  );
  const [upvoteCount, setUpvoteCount] = useState(report.upvotedBy?.length ?? 0);

  const timeAgo = report.createdAt
    ? formatDistanceToNow(report.createdAt.toDate(), { addSuffix: true })
    : "";

  const handleUpvote = async () => {
    if (onUpvote) {
      onUpvote();
      return;
    }
    if (!user) return;
    const nextState = !isUpvoted;
    setIsUpvoted(nextState);
    setUpvoteCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
    try {
      await toggleUpvoteReport(report.reportId, user.uid);
    } catch {
      // rollback on failure
      setIsUpvoted(!nextState);
      setUpvoteCount((prev) => (nextState ? Math.max(0, prev - 1) : prev + 1));
    }
  };

  const handleShare = async () => {
    try {
      const headline = `${isWin ? "Civic win" : "Civic issue"} in ${report.city ?? "our community"}`;
      const body = report.description
        ? `${headline}: "${report.description}"`
        : headline;
      await Share.share({
        title: headline,
        message: `${body}\n\nCheck it out on ReCiti!`,
      });
    } catch {
      // dismissed
    }
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* Upper clickable section navigating to report details */}
      <AnimatedButton onPress={onPress} style={styles.clickableArea}>
        {/* Cover Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: report.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
          {/* Vibe badge */}
          <View style={styles.vibeBadge}>
            <Badge
              label={isWin ? "CIVIC WIN" : "CIVIC ISSUE"}
              variant={isWin ? "primary" : "danger"}
            />
          </View>
          {/* Category badge */}
          <View style={styles.categoryBadge}>
            <Badge label={report.category.toUpperCase()} variant="default" />
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Typography variant="caption" color={colors.textMuted}>
            {report.city ?? "Nearby"} / {timeAgo}
          </Typography>

          <Typography
            variant="body"
            weight="semiBold"
            numberOfLines={1}
            style={{ marginTop: 2, height: 38 }}
          >
            {report.description && report.description.trim().length > 0
              ? report.description
              : `${report.category.charAt(0).toUpperCase() + report.category.slice(1)} ${isWin ? "celebrated" : "reported"}`}
          </Typography>
        </View>
      </AnimatedButton>

      {/* Footer Row with Upvote, Comment and Share */}
      <View style={styles.footerRow}>
        <View style={styles.leftActions}>
          {/* Upvote Button */}
          <AnimatedButton
            onPress={handleUpvote}
            hapticFeedback="light"
            style={styles.actionBtn}
          >
            <Ionicons
              name={isUpvoted ? "thumbs-up" : "thumbs-up-outline"}
              size={18}
              color={isUpvoted ? colors.primary : colors.textMuted}
            />
            <Typography
              variant="caption"
              weight={isUpvoted ? "bold" : "semiBold"}
              color={isUpvoted ? colors.primary : colors.textMuted}
              style={{ marginLeft: 4 }}
            >
              {upvoteCount}
            </Typography>
          </AnimatedButton>

          {/* Comment Button */}
          <AnimatedButton
            onPress={onPress}
            hapticFeedback="light"
            style={[styles.actionBtn, { marginLeft: 14 }]}
          >
            <Ionicons
              name="chatbubble-outline"
              size={18}
              color={colors.textMuted}
            />
            <Typography
              variant="caption"
              weight="semiBold"
              color={colors.textMuted}
              style={{ marginLeft: 4 }}
            >
              {report.commentCount ?? 0}
            </Typography>
          </AnimatedButton>
        </View>

        {/* Share Button */}
        <AnimatedButton
          onPress={handleShare}
          hapticFeedback="light"
          style={styles.shareBtn}
        >
          <Ionicons
            name="share-social-outline"
            size={18}
            color={colors.textMuted}
          />
        </AnimatedButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 240,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginRight: 12,
  },
  clickableArea: {
    width: "100%",
  },
  imageContainer: {
    width: "100%",
    height: 125,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  vibeBadge: {
    position: "absolute",
    top: 8,
    left: 8,
  },
  categoryBadge: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  leftActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  shareBtn: {
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
});
