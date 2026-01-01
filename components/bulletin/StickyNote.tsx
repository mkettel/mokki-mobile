import { typography } from "@/constants/theme";
import { getColorInfo, getCategoryInfo, parseChecklistContent } from "@/lib/api/bulletin";
import { useColors } from "@/lib/context/theme";
import type { BulletinItemWithProfile, BulletinStyle } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Autolink from "react-native-autolink";

interface StickyNoteProps {
  item: BulletinItemWithProfile;
  onEdit?: (item: BulletinItemWithProfile) => void;
  onDelete?: (item: BulletinItemWithProfile) => void;
  onToggleChecklistItem?: (item: BulletinItemWithProfile, itemId: string) => void;
}

export function StickyNote({ item, onEdit, onDelete, onToggleChecklistItem }: StickyNoteProps) {
  const colors = useColors();
  const colorInfo = getColorInfo(item.color);
  const categoryInfo = getCategoryInfo(item.category);

  // Generate seeded rotation based on item ID for consistent randomness
  const getRotation = () => {
    const hash = item.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return ((hash % 9) - 4) * 0.5; // -2 to 2 degrees
  };

  const rotation = getRotation();

  const getStyleDecoration = (style: BulletinStyle) => {
    switch (style) {
      case "sticky":
        return (
          <View style={[styles.tape, { backgroundColor: "rgba(255,255,255,0.7)" }]} />
        );
      case "paper":
        return (
          <View style={[styles.paperclip, { backgroundColor: colors.mutedForeground }]} />
        );
      case "sticker":
        return (
          <View style={styles.stickerCorner} />
        );
      case "keychain":
        return (
          <View style={styles.keychainHole}>
            <View style={[styles.keychainRing, { borderColor: colors.mutedForeground }]} />
          </View>
        );
      case "todo":
        return (
          <View style={styles.todoIcon}>
            <FontAwesome name="check-square-o" size={14} color={colorInfo.text} />
          </View>
        );
      default:
        return null;
    }
  };

  const getCategoryIcon = (icon: string): React.ComponentProps<typeof FontAwesome>["name"] => {
    switch (icon) {
      case "wifi":
        return "wifi";
      case "home":
        return "home";
      case "exclamation-triangle":
        return "exclamation-triangle";
      case "map-marker":
        return "map-marker";
      default:
        return "tag";
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colorInfo.bg,
          transform: [{ rotate: `${rotation}deg` }],
        },
      ]}
    >
      {/* Style decoration */}
      {getStyleDecoration(item.style)}

      {/* Action buttons */}
      <View style={styles.actions}>
        {onEdit && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onEdit(item)}
          >
            <FontAwesome name="pencil" size={12} color={colorInfo.text} />
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onDelete(item)}
          >
            <FontAwesome name="trash-o" size={12} color={colorInfo.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category badge */}
      {categoryInfo && (
        <View style={[styles.categoryBadge, { backgroundColor: "rgba(0,0,0,0.1)" }]}>
          <FontAwesome
            name={getCategoryIcon(categoryInfo.icon)}
            size={10}
            color={colorInfo.text}
          />
          <Text style={[styles.categoryText, { color: colorInfo.text }]}>
            {categoryInfo.label}
          </Text>
        </View>
      )}

      {/* Title */}
      <Text style={[styles.title, { color: colorInfo.text }]}>
        {item.title}
      </Text>

      {/* Content */}
      {item.style === "todo" ? (
        <View style={styles.checklistContainer}>
          {parseChecklistContent(item.content).map((checkItem) => (
            <TouchableOpacity
              key={checkItem.id}
              style={styles.checklistItem}
              onPress={() => onToggleChecklistItem?.(item, checkItem.id)}
              activeOpacity={0.7}
            >
              <FontAwesome
                name={checkItem.completed ? "check-square" : "square-o"}
                size={16}
                color={colorInfo.text}
              />
              <Text
                style={[
                  styles.checklistText,
                  { color: colorInfo.text },
                  checkItem.completed && styles.checklistTextCompleted,
                ]}
              >
                {checkItem.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Autolink
          text={item.content}
          url
          email
          phone
          style={[styles.content, { color: colorInfo.text }]}
          linkStyle={{ textDecorationLine: "underline" }}
        />
      )}

      {/* Footer with creator */}
      <View style={styles.footer}>
        <Text style={[styles.creatorText, { color: colorInfo.text }]}>
          — {item.profiles?.display_name || "Unknown"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 4,
    minHeight: 140,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  actions: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    gap: 8,
    zIndex: 10,
  },
  actionButton: {
    padding: 4,
    opacity: 0.6,
  },
  tape: {
    position: "absolute",
    top: -4,
    left: "50%",
    marginLeft: -20,
    width: 40,
    height: 12,
    borderRadius: 2,
    transform: [{ rotate: "-2deg" }],
  },
  paperclip: {
    position: "absolute",
    top: -6,
    right: 16,
    width: 8,
    height: 24,
    borderRadius: 4,
  },
  stickerCorner: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderTopLeftRadius: 12,
  },
  keychainHole: {
    position: "absolute",
    top: 8,
    left: "50%",
    marginLeft: -8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  keychainRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  todoIcon: {
    position: "absolute",
    top: 8,
    left: 8,
  },
  checklistContainer: {
    gap: 8,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  checklistText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    flex: 1,
    lineHeight: 18,
  },
  checklistTextCompleted: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
    gap: 4,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  title: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxSemibold,
    marginBottom: 8,
  },
  content: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    lineHeight: 18,
  },
  footer: {
    marginTop: 12,
  },
  creatorText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
    fontStyle: "italic",
    opacity: 0.7,
  },
});
