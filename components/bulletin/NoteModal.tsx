import { typography } from "@/constants/theme";
import {
  BULLETIN_CATEGORIES,
  BULLETIN_COLORS,
  BULLETIN_STYLES,
} from "@/lib/api/bulletin";
import { useColors } from "@/lib/context/theme";
import type {
  BulletinCategory,
  BulletinItemWithProfile,
  BulletinStyle,
} from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface NoteModalProps {
  visible: boolean;
  item?: BulletinItemWithProfile | null;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    content: string;
    category: BulletinCategory | null;
    color: string;
    style: BulletinStyle;
  }) => Promise<void>;
}

export function NoteModal({ visible, item, onClose, onSubmit }: NoteModalProps) {
  const colors = useColors();
  const isEditing = !!item;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<BulletinCategory | null>(null);
  const [color, setColor] = useState("yellow");
  const [style, setStyle] = useState<BulletinStyle>("sticky");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or item changes
  useEffect(() => {
    if (visible) {
      if (item) {
        setTitle(item.title);
        setContent(item.content);
        setCategory(item.category);
        setColor(item.color);
        setStyle(item.style);
      } else {
        setTitle("");
        setContent("");
        setCategory(null);
        setColor("yellow");
        setStyle("sticky");
      }
      setError(null);
    }
  }, [visible, item]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!content.trim()) {
      setError("Content is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        category,
        color,
        style,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="times" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {isEditing ? "Edit Note" : "Add Note"}
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.submitButtonText, { color: colors.primaryForeground }]}>
                {isEditing ? "Save" : "Add"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Error message */}
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: "#fef2f2" }]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Category selector */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Category (optional)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: !category ? colors.primary : colors.muted,
                    borderColor: !category ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setCategory(null)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: !category ? "#fff" : colors.foreground },
                  ]}
                >
                  None
                </Text>
              </TouchableOpacity>
              {BULLETIN_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor:
                        category === cat.value ? colors.primary : colors.muted,
                      borderColor:
                        category === cat.value ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setCategory(cat.value)}
                >
                  <FontAwesome
                    name={getCategoryIcon(cat.icon)}
                    size={12}
                    color={category === cat.value ? "#fff" : colors.foreground}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      {
                        color:
                          category === cat.value ? "#fff" : colors.foreground,
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Title input */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Title *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter a title"
              placeholderTextColor={colors.mutedForeground}
              maxLength={100}
            />
            <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
              {title.length}/100
            </Text>
          </View>

          {/* Content input */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Content *
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              value={content}
              onChangeText={setContent}
              placeholder="Write your note..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
              {content.length}/1000
            </Text>
          </View>

          {/* Color picker */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Color
            </Text>
            <View style={styles.colorRow}>
              {BULLETIN_COLORS.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c.bg },
                    color === c.value && styles.colorSwatchSelected,
                  ]}
                  onPress={() => setColor(c.value)}
                >
                  {color === c.value && (
                    <FontAwesome name="check" size={16} color={c.text} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Style picker */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Style
            </Text>
            <View style={styles.styleRow}>
              {BULLETIN_STYLES.map((s) => (
                <TouchableOpacity
                  key={s.value}
                  style={[
                    styles.styleOption,
                    {
                      backgroundColor:
                        style === s.value ? colors.primary : colors.muted,
                      borderColor:
                        style === s.value ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setStyle(s.value)}
                >
                  <Text style={styles.styleEmoji}>{s.emoji}</Text>
                  <Text
                    style={[
                      styles.styleLabel,
                      { color: style === s.value ? "#fff" : colors.foreground },
                    ]}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bottom padding */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  section: {
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 8,
  },
  categoryScroll: {
    flexDirection: "row",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
    minHeight: 120,
  },
  charCount: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "right",
    marginTop: 4,
  },
  colorRow: {
    flexDirection: "row",
    gap: 12,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: "rgba(0,0,0,0.2)",
  },
  styleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  styleOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  styleEmoji: {
    fontSize: 16,
  },
  styleLabel: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
});
