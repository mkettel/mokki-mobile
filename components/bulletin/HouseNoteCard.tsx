import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import type { HouseNoteWithEditor } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";

interface HouseNoteCardProps {
  note: HouseNoteWithEditor | null;
  onSave: (content: string) => Promise<void>;
}

export function HouseNoteCard({ note, onSave }: HouseNoteCardProps) {
  const colors = useColors();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(note?.content || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(content);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving house note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(note?.content || "");
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Notebook holes decoration */}
      <View style={styles.holesContainer}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.hole, { backgroundColor: colors.background }]}
          />
        ))}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <FontAwesome name="sticky-note-o" size={16} color={colors.foreground} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            House Notes
          </Text>
        </View>
        {!isEditing && (
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.muted }]}
            onPress={() => setIsEditing(true)}
          >
            <FontAwesome name="pencil" size={12} color={colors.foreground} />
            <Text style={[styles.editButtonText, { color: colors.foreground }]}>
              Edit
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Red line under header */}
      <View style={styles.redLine} />

      {/* Content */}
      <View style={styles.contentContainer}>
        {isEditing ? (
          <TextInput
            style={[
              styles.textInput,
              {
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
            value={content}
            onChangeText={setContent}
            multiline
            placeholder="Write shared notes for the house..."
            placeholderTextColor={colors.mutedForeground}
            textAlignVertical="top"
            autoFocus
          />
        ) : note?.content ? (
          <Markdown
            style={{
              body: {
                color: colors.foreground,
                fontSize: 14,
                fontFamily: typography.fontFamily.chillax,
                lineHeight: 24,
              },
              heading1: {
                color: colors.foreground,
                fontSize: 20,
                fontFamily: typography.fontFamily.chillaxSemibold,
                marginBottom: 8,
                marginTop: 12,
              },
              heading2: {
                color: colors.foreground,
                fontSize: 18,
                fontFamily: typography.fontFamily.chillaxSemibold,
                marginBottom: 6,
                marginTop: 10,
              },
              heading3: {
                color: colors.foreground,
                fontSize: 16,
                fontFamily: typography.fontFamily.chillaxMedium,
                marginBottom: 4,
                marginTop: 8,
              },
              strong: {
                fontFamily: typography.fontFamily.chillaxBold,
                fontWeight: "normal" as const,
              },
              em: {
                fontFamily: typography.fontFamily.chillaxMedium,
                fontStyle: "normal" as const,
              },
              bullet_list: {
                marginVertical: 4,
              },
              ordered_list: {
                marginVertical: 4,
              },
              list_item: {
                marginVertical: 2,
              },
              code_inline: {
                backgroundColor: colors.muted,
                color: colors.foreground,
                fontFamily: "monospace",
                paddingHorizontal: 4,
                paddingVertical: 2,
                borderRadius: 4,
              },
              fence: {
                backgroundColor: colors.muted,
                color: colors.foreground,
                fontFamily: "monospace",
                padding: 12,
                borderRadius: 6,
                marginVertical: 8,
              },
              blockquote: {
                backgroundColor: colors.muted,
                borderLeftColor: colors.primary,
                borderLeftWidth: 4,
                paddingLeft: 12,
                paddingVertical: 4,
                marginVertical: 8,
              },
              link: {
                color: colors.primary,
              },
              hr: {
                backgroundColor: colors.border,
                height: 1,
                marginVertical: 12,
              },
            }}
          >
            {note.content}
          </Markdown>
        ) : (
          <View style={styles.emptyState}>
            <FontAwesome
              name="pencil"
              size={24}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No notes yet. Tap Edit to add shared house notes.
            </Text>
          </View>
        )}
      </View>

      {/* Ruled lines background effect */}
      <View style={[styles.ruledLines, { borderColor: colors.border }]} pointerEvents="none">
        {[...Array(10)].map((_, i) => (
          <View
            key={i}
            style={[styles.ruleLine, { borderBottomColor: `${colors.border}40` }]}
          />
        ))}
      </View>

      {/* Footer */}
      {isEditing ? (
        <View style={styles.editActions}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={handleCancel}
            disabled={isSaving}
          >
            <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <FontAwesome name="check" size={12} color="#fff" />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : note?.updated_at ? (
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Last edited by {note.profiles?.display_name || "Unknown"} on{" "}
            {formatDate(note.updated_at)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    minHeight: 200,
    position: "relative",
  },
  holesContainer: {
    position: "absolute",
    left: 12,
    top: 0,
    bottom: 0,
    justifyContent: "space-evenly",
    paddingVertical: 20,
    zIndex: 10,
  },
  hole: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 36,
    paddingTop: 16,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  editButtonText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  redLine: {
    height: 2,
    backgroundColor: "#dc2626",
    marginHorizontal: 36,
    marginBottom: 12,
  },
  contentContainer: {
    paddingHorizontal: 36,
    paddingBottom: 16,
    minHeight: 100,
    zIndex: 5,
  },
  contentText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    lineHeight: 24,
  },
  textInput: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    lineHeight: 24,
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
  },
  ruledLines: {
    position: "absolute",
    left: 36,
    right: 16,
    top: 70,
    bottom: 50,
    zIndex: 1,
  },
  ruleLine: {
    height: 24,
    borderBottomWidth: 1,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 36,
    paddingBottom: 16,
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  footer: {
    paddingHorizontal: 36,
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
    fontStyle: "italic",
  },
});
