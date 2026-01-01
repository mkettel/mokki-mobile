import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import type { BulletinItemWithProfile } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { StickyNote } from "./StickyNote";

interface BulletinGridProps {
  items: BulletinItemWithProfile[];
  onEditItem?: (item: BulletinItemWithProfile) => void;
  onDeleteItem?: (item: BulletinItemWithProfile) => void;
  onToggleChecklistItem?: (item: BulletinItemWithProfile, itemId: string) => void;
}

export function BulletinGrid({
  items,
  onEditItem,
  onDeleteItem,
  onToggleChecklistItem,
}: BulletinGridProps) {
  const colors = useColors();
  const screenWidth = Dimensions.get("window").width;
  const numColumns = screenWidth > 600 ? 2 : 1;
  const itemWidth = (screenWidth - 48 - (numColumns - 1) * 12) / numColumns;

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="thumb-tack" size={48} color={colors.foreground} />
        <Text style={[styles.emptyText, { color: colors.foreground }]}>
          No notes yet
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.foreground }]}>
          Add a note to share info with housemates
        </Text>
      </View>
    );
  }

  // Split items into columns for masonry-like layout
  const columns: BulletinItemWithProfile[][] = Array.from(
    { length: numColumns },
    () => []
  );
  items.forEach((item, index) => {
    columns[index % numColumns].push(item);
  });

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.grid}>
        {columns.map((column, columnIndex) => (
          <View key={columnIndex} style={[styles.column, { width: itemWidth }]}>
            {column.map((item) => (
              <View key={item.id} style={styles.noteWrapper}>
                <StickyNote
                  item={item}
                  onEdit={onEditItem}
                  onDelete={onDeleteItem}
                  onToggleChecklistItem={onToggleChecklistItem}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  grid: {
    flexDirection: "row",
    gap: 12,
  },
  column: {
    gap: 12,
  },
  noteWrapper: {
    marginBottom: 0,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
});
