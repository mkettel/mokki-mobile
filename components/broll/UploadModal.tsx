import { typography } from "@/constants/theme";
import { formatFileSize } from "@/lib/api/broll";
import { useColors } from "@/lib/context/theme";
import { FontAwesome } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

interface SelectedMedia {
  uri: string;
  base64?: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  duration?: number;
  caption: string;
}

interface UploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (
    media: SelectedMedia[],
    onProgress?: (current: number, total: number) => void
  ) => Promise<void>;
}

export function UploadModal({ visible, onClose, onUpload }: UploadModalProps) {
  const colors = useColors();
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [sharedCaption, setSharedCaption] = useState("");

  const resetState = () => {
    setSelectedMedia([]);
    setSharedCaption("");
    setIsUploading(false);
    setUploadProgress("");
  };

  const handleClose = () => {
    if (!isUploading) {
      resetState();
      onClose();
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      const message = "We need permission to access your photos";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Permission Required", message);
      }
      return;
    }

    // Multi-select on native, single on web (web doesn't support multi-select)
    const remainingSlots = 10 - selectedMedia.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      allowsMultipleSelection: Platform.OS !== "web",
      selectionLimit: remainingSlots > 0 ? remainingSlots : 1,
      quality: 0.8,
      exif: true,
      base64: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newItems: SelectedMedia[] = result.assets.map((asset, index) => {
        const fileName =
          asset.fileName || `media_${Date.now()}_${index}.jpg`;
        const mimeType =
          asset.mimeType ||
          (asset.type === "video" ? "video/mp4" : "image/jpeg");

        return {
          uri: asset.uri,
          base64: asset.base64,
          fileName,
          mimeType,
          fileSize: asset.fileSize || 0,
          width: asset.width,
          height: asset.height,
          duration: asset.duration
            ? Math.round(asset.duration / 1000)
            : undefined,
          caption: "",
        };
      });

      // Append to existing selection, up to limit of 10
      setSelectedMedia((prev) => {
        const combined = [...prev, ...newItems];
        return combined.slice(0, 10);
      });
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      const message = "We need permission to access your camera";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Permission Required", message);
      }
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = `camera_${Date.now()}.jpg`;
      const mimeType = asset.mimeType || "image/jpeg";

      const newItem: SelectedMedia = {
        uri: asset.uri,
        base64: asset.base64,
        fileName,
        mimeType,
        fileSize: asset.fileSize || 0,
        width: asset.width,
        height: asset.height,
        duration: asset.duration
          ? Math.round(asset.duration / 1000)
          : undefined,
        caption: "",
      };

      // Append to existing selection, up to limit of 10
      setSelectedMedia((prev) => [...prev, newItem].slice(0, 10));
    }
  };

  const handleUpload = async () => {
    if (selectedMedia.length === 0) return;

    setIsUploading(true);
    const total = selectedMedia.length;
    setUploadProgress(total > 1 ? `Uploading 1 of ${total}...` : "Uploading...");

    try {
      // Apply shared caption to all items
      const itemsWithCaption = selectedMedia.map((item) => ({
        ...item,
        caption: sharedCaption,
      }));

      // Progress callback to update UI
      const handleProgress = (current: number, itemTotal: number) => {
        if (itemTotal > 1) {
          setUploadProgress(`Uploading ${current} of ${itemTotal}...`);
        }
      };

      await onUpload(itemsWithCaption, handleProgress);
      resetState();
      onClose();
    } catch (error) {
      console.error("Upload error:", error);
      const message = "Failed to upload. Please try again.";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Upload Error", message);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const removeItem = (index: number) => {
    setSelectedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const hasVideos = selectedMedia.some((m) => m.mimeType?.startsWith("video/"));
  const totalSize = selectedMedia.reduce((sum, m) => sum + m.fileSize, 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            disabled={isUploading}
          >
            <FontAwesome name="times" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Upload Media
          </Text>
          <TouchableOpacity
            onPress={handleUpload}
            disabled={selectedMedia.length === 0 || isUploading}
            style={[
              styles.uploadButton,
              {
                backgroundColor:
                  selectedMedia.length > 0 ? colors.primary : colors.muted,
              },
            ]}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                style={[
                  styles.uploadButtonText,
                  { opacity: selectedMedia.length > 0 ? 1 : 0.5 },
                ]}
              >
                Upload{selectedMedia.length > 1 ? ` (${selectedMedia.length})` : ""}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {selectedMedia.length === 0 ? (
            // Selection options
            <View style={styles.selectOptions}>
              <Text style={[styles.selectTitle, { color: colors.foreground }]}>
                Choose media to upload
              </Text>

              <TouchableOpacity
                style={[
                  styles.optionButton,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={pickImage}
              >
                <View
                  style={[
                    styles.optionIcon,
                    { backgroundColor: colors.primary + "20" },
                  ]}
                >
                  <FontAwesome name="image" size={24} color={colors.primary} />
                </View>
                <View style={styles.optionText}>
                  <Text
                    style={[styles.optionTitle, { color: colors.foreground }]}
                  >
                    Choose from Library
                  </Text>
                  <Text
                    style={[
                      styles.optionSubtitle,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {Platform.OS === "web"
                      ? "Select a photo or video"
                      : "Select up to 10 photos or videos"}
                  </Text>
                </View>
                <FontAwesome
                  name="chevron-right"
                  size={16}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>

              {Platform.OS !== "web" && (
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={takePhoto}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: colors.primary + "20" },
                    ]}
                  >
                    <FontAwesome
                      name="camera"
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.optionText}>
                    <Text
                      style={[styles.optionTitle, { color: colors.foreground }]}
                    >
                      Take Photo
                    </Text>
                    <Text
                      style={[
                        styles.optionSubtitle,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Use your camera
                    </Text>
                  </View>
                  <FontAwesome
                    name="chevron-right"
                    size={16}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              )}

              <Text
                style={[styles.infoText, { color: colors.mutedForeground }]}
              >
                Images up to 10MB, videos up to 100MB
              </Text>
            </View>
          ) : (
            // Preview and caption
            <View style={styles.previewSection}>
              {/* Multi-image preview */}
              <View style={styles.multiPreviewContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.previewScroll}
                >
                  {selectedMedia.map((item, index) => {
                    const isVideo = item.mimeType?.startsWith("video/");
                    return (
                      <View key={item.uri} style={styles.previewItem}>
                        <Image
                          source={{ uri: item.uri }}
                          style={styles.previewThumbnail}
                          resizeMode="cover"
                        />
                        {isVideo && (
                          <View style={styles.videoIndicator}>
                            <FontAwesome
                              name="play-circle"
                              size={32}
                              color="#fff"
                            />
                          </View>
                        )}
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removeItem(index)}
                          disabled={isUploading}
                        >
                          <FontAwesome name="times" size={12} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Selection info */}
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: colors.foreground }]}>
                  {selectedMedia.length} item
                  {selectedMedia.length > 1 ? "s" : ""} selected
                </Text>
                <Text
                  style={[
                    styles.fileDetails,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {formatFileSize(totalSize)}
                  {hasVideos ? " • includes videos" : ""}
                </Text>
              </View>

              {/* Add more button */}
              {Platform.OS !== "web" && selectedMedia.length < 10 && (
                <TouchableOpacity
                  style={[
                    styles.addMoreButton,
                    { borderColor: colors.border },
                  ]}
                  onPress={pickImage}
                  disabled={isUploading}
                >
                  <FontAwesome
                    name="plus"
                    size={14}
                    color={colors.foreground}
                  />
                  <Text
                    style={[styles.addMoreText, { color: colors.foreground }]}
                  >
                    Add more
                  </Text>
                </TouchableOpacity>
              )}

              {/* Caption input */}
              <View style={styles.captionSection}>
                <Text
                  style={[styles.captionLabel, { color: colors.foreground }]}
                >
                  Caption{selectedMedia.length > 1 ? " (applies to all)" : ""}{" "}
                  (optional)
                </Text>
                <TextInput
                  style={[
                    styles.captionInput,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.foreground,
                    },
                  ]}
                  value={sharedCaption}
                  onChangeText={setSharedCaption}
                  placeholder="Add a caption..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  editable={!isUploading}
                />
              </View>

              {/* Upload progress */}
              {uploadProgress && (
                <View style={styles.progressContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text
                    style={[
                      styles.progressText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {uploadProgress}
                  </Text>
                </View>
              )}
            </View>
          )}
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
  uploadButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 70,
    alignItems: "center",
  },
  uploadButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  content: {
    flex: 1,
  },
  selectOptions: {
    padding: 20,
    gap: 12,
  },
  selectTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 8,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  optionSubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  infoText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
    marginTop: 12,
  },
  previewSection: {
    padding: 20,
  },
  multiPreviewContainer: {
    marginBottom: 8,
  },
  previewScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  previewItem: {
    width: 140,
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  previewThumbnail: {
    width: "100%",
    height: "100%",
  },
  videoIndicator: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  removeButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  addMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: "dashed",
    marginTop: 12,
    gap: 8,
  },
  addMoreText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  fileInfo: {
    marginTop: 16,
  },
  fileName: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  fileDetails: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 4,
  },
  captionSection: {
    marginTop: 20,
  },
  captionLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 8,
  },
  captionInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
    minHeight: 80,
    textAlignVertical: "top",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    gap: 8,
  },
  progressText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
});
