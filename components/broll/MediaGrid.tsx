import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import type { BRollMediaGroupedByDay, BRollMediaWithProfile } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MediaItem } from "./MediaItem";

interface MediaGridProps {
  grouped: BRollMediaGroupedByDay[];
  onItemPress: (item: BRollMediaWithProfile) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

const screenWidth = Dimensions.get("window").width;
const numColumns = 2;
const gap = 8;
const padding = 16;
const itemSize = (screenWidth - padding * 2 - gap * (numColumns - 1)) / numColumns;

export function MediaGrid({
  grouped,
  onItemPress,
  onLoadMore,
  hasMore,
  isLoading,
}: MediaGridProps) {
  const colors = useColors();

  if (grouped.length === 0 && !isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="camera" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          No photos or videos yet
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
          Upload some memories to share with your housemates
        </Text>
      </View>
    );
  }

  const handleScroll = (event: any) => {
    if (!hasMore || !onLoadMore || isLoading) return;

    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isNearBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 500;

    if (isNearBottom) {
      onLoadMore();
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={400}
    >
      {grouped.map((group) => (
        <View key={group.date} style={styles.dayGroup}>
          {/* Date header */}
          <Text style={[styles.dateHeader, { color: colors.foreground }]}>
            {group.displayDate}
          </Text>

          {/* Media grid */}
          <View style={styles.grid}>
            {group.items.map((item) => (
              <MediaItem
                key={item.id}
                item={item}
                onPress={onItemPress}
                size={itemSize}
              />
            ))}
          </View>
        </View>
      ))}

      {/* Load more indicator */}
      {hasMore && (
        <View style={styles.loadMore}>
          <Text style={[styles.loadMoreText, { color: colors.mutedForeground }]}>
            {isLoading ? "Loading..." : "Scroll for more"}
          </Text>
        </View>
      )}

      {/* Bottom padding */}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
  },
  dayGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxSemibold,
    marginBottom: 12,
    paddingHorizontal: padding,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: padding,
    gap: gap,
  },
  loadMore: {
    alignItems: "center",
    paddingVertical: 16,
  },
  loadMoreText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
});
