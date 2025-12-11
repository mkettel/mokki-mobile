import { typography } from "@/constants/theme";
import { formatDuration, formatFileSize } from "@/lib/api/broll";
import { useColors } from "@/lib/context/theme";
import type { BRollMediaWithProfile } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import { format } from "date-fns";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface MediaViewerProps {
  item: BRollMediaWithProfile | null;
  visible: boolean;
  currentUserId: string;
  onClose: () => void;
  onUpdateCaption: (itemId: string, caption: string | null) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export function MediaViewer({
  item,
  visible,
  currentUserId,
  onClose,
  onUpdateCaption,
  onDelete,
}: MediaViewerProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionText, setCaptionText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!item) return null;

  const isOwner = item.uploaded_by === currentUserId;
  const isVideo = item.media_type === "video";

  const handleEditCaption = () => {
    setCaptionText(item.caption || "");
    setIsEditingCaption(true);
  };

  const handleSaveCaption = async () => {
    setIsSaving(true);
    try {
      await onUpdateCaption(item.id, captionText || null);
      setIsEditingCaption(false);
    } catch (error) {
      console.error("Error saving caption:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingCaption(false);
    setCaptionText(item.caption || "");
  };

  const handleDelete = () => {
    const message = "Delete this media? This cannot be undone.";

    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        performDelete();
      }
    } else {
      Alert.alert("Delete Media", message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: performDelete,
        },
      ]);
    }
  };

  const performDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(item.id);
      onClose();
    } catch (error) {
      console.error("Error deleting:", error);
      if (Platform.OS === "web") {
        window.alert("Error deleting media");
      } else {
        Alert.alert("Error", "Failed to delete media");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const formatUploadDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: "#000" }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <FontAwesome name="times" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            {isOwner && (
              <TouchableOpacity
                onPress={handleDelete}
                style={styles.headerButton}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <FontAwesome name="trash-o" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Media */}
        <View style={styles.mediaContainer}>
          {isVideo ? (
            <View style={styles.videoPlaceholder}>
              <Image
                source={{ uri: item.thumbnail_url || item.public_url }}
                style={styles.media}
                resizeMode="contain"
              />
              <View style={styles.videoOverlay}>
                <View style={styles.playButtonLarge}>
                  <FontAwesome name="play" size={32} color="#fff" />
                </View>
                <Text style={styles.videoNote}>Video playback coming soon</Text>
              </View>
            </View>
          ) : (
            <Image
              source={{ uri: item.public_url }}
              style={styles.media}
              resizeMode="contain"
            />
          )}
        </View>

        {/* Info panel */}
        <ScrollView
          style={[styles.infoPanel, { paddingBottom: insets.bottom + 16 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Uploader info */}
          <View style={styles.uploaderRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {item.profiles?.display_name?.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
            <View style={styles.uploaderInfo}>
              <Text style={styles.uploaderName}>
                {item.profiles?.display_name || "Unknown"}
              </Text>
              <Text style={styles.uploadDate}>
                {formatUploadDate(item.created_at)}
              </Text>
            </View>
          </View>

          {/* File info */}
          <View style={styles.fileInfo}>
            <Text style={styles.fileInfoText}>
              {formatFileSize(item.file_size)}
              {item.width && item.height && ` • ${item.width}×${item.height}`}
              {isVideo &&
                item.duration &&
                ` • ${formatDuration(item.duration)}`}
            </Text>
          </View>

          {/* Caption */}
          <View style={styles.captionSection}>
            {isEditingCaption ? (
              <View style={styles.captionEdit}>
                <TextInput
                  style={styles.captionInput}
                  value={captionText}
                  onChangeText={setCaptionText}
                  placeholder="Add a caption..."
                  placeholderTextColor="#666"
                  multiline
                  autoFocus
                />
                <View style={styles.captionActions}>
                  <TouchableOpacity
                    style={styles.captionButton}
                    onPress={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.captionButton, styles.saveButton]}
                    onPress={handleSaveCaption}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.captionDisplay}>
                <Text style={styles.captionLabel}>Caption</Text>
                <Text
                  style={[
                    styles.captionValue,
                    !item.caption && styles.noCaption,
                  ]}
                >
                  {item.caption || "No caption"}
                </Text>
                {isOwner && (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={handleEditCaption}
                  >
                    <FontAwesome name="pencil" size={12} color="#fff" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  mediaContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  media: {
    width: screenWidth,
    height: screenHeight * 0.5,
    borderRadius: 10,
  },
  videoPlaceholder: {
    width: screenWidth,
    height: screenHeight * 0.5,
    justifyContent: "center",
    alignItems: "center",
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  playButtonLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 6,
  },
  videoNote: {
    color: "#999",
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 12,
  },
  infoPanel: {
    backgroundColor: "#111",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: screenHeight * 0.35,
  },
  uploaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  uploaderInfo: {
    marginLeft: 12,
  },
  uploaderName: {
    color: "#fff",
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  uploadDate: {
    color: "#888",
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  fileInfo: {
    marginBottom: 16,
  },
  fileInfoText: {
    color: "#666",
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
  captionSection: {
    marginBottom: 20,
  },
  captionDisplay: {
    gap: 4,
  },
  captionLabel: {
    color: "#666",
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
    textTransform: "uppercase",
  },
  captionValue: {
    color: "#fff",
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    lineHeight: 20,
  },
  noCaption: {
    color: "#666",
    fontStyle: "italic",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  captionEdit: {
    gap: 12,
  },
  captionInput: {
    backgroundColor: "#222",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    minHeight: 80,
    textAlignVertical: "top",
  },
  captionActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  captionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButton: {
    backgroundColor: "#3b82f6",
  },
  cancelButtonText: {
    color: "#888",
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
});
