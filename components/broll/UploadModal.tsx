import { typography } from "@/constants/theme";
import { formatFileSize, getMediaType } from "@/lib/api/broll";
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
  onUpload: (media: SelectedMedia) => Promise<void>;
}

export function UploadModal({ visible, onClose, onUpload }: UploadModalProps) {
  const colors = useColors();
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const resetState = () => {
    setSelectedMedia(null);
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

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.8,
      exif: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.fileName || `media_${Date.now()}`;
      const mimeType = asset.mimeType || (asset.type === "video" ? "video/mp4" : "image/jpeg");

      setSelectedMedia({
        uri: asset.uri,
        fileName,
        mimeType,
        fileSize: asset.fileSize || 0,
        width: asset.width,
        height: asset.height,
        duration: asset.duration ? Math.round(asset.duration / 1000) : undefined,
        caption: "",
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
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = `camera_${Date.now()}.jpg`;
      const mimeType = asset.mimeType || "image/jpeg";

      setSelectedMedia({
        uri: asset.uri,
        fileName,
        mimeType,
        fileSize: asset.fileSize || 0,
        width: asset.width,
        height: asset.height,
        duration: asset.duration ? Math.round(asset.duration / 1000) : undefined,
        caption: "",
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedMedia) return;

    setIsUploading(true);
    setUploadProgress("Uploading...");

    try {
      await onUpload(selectedMedia);
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

  const isVideo = selectedMedia?.mimeType?.startsWith("video/");

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
            disabled={!selectedMedia || isUploading}
            style={[
              styles.uploadButton,
              {
                backgroundColor: selectedMedia ? colors.primary : colors.muted,
              },
            ]}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                style={[
                  styles.uploadButtonText,
                  { opacity: selectedMedia ? 1 : 0.5 },
                ]}
              >
                Upload
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {!selectedMedia ? (
            // Selection options
            <View style={styles.selectOptions}>
              <Text style={[styles.selectTitle, { color: colors.foreground }]}>
                Choose media to upload
              </Text>

              <TouchableOpacity
                style={[styles.optionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={pickImage}
              >
                <View style={[styles.optionIcon, { backgroundColor: colors.primary + "20" }]}>
                  <FontAwesome name="image" size={24} color={colors.primary} />
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, { color: colors.foreground }]}>
                    Choose from Library
                  </Text>
                  <Text style={[styles.optionSubtitle, { color: colors.mutedForeground }]}>
                    Select photos or videos
                  </Text>
                </View>
                <FontAwesome name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>

              {Platform.OS !== "web" && (
                <TouchableOpacity
                  style={[styles.optionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={takePhoto}
                >
                  <View style={[styles.optionIcon, { backgroundColor: colors.primary + "20" }]}>
                    <FontAwesome name="camera" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionTitle, { color: colors.foreground }]}>
                      Take Photo
                    </Text>
                    <Text style={[styles.optionSubtitle, { color: colors.mutedForeground }]}>
                      Use your camera
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}

              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                Images up to 10MB, videos up to 100MB
              </Text>
            </View>
          ) : (
            // Preview and caption
            <View style={styles.previewSection}>
              {/* Preview */}
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: selectedMedia.uri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                {isVideo && (
                  <View style={styles.videoIndicator}>
                    <FontAwesome name="play-circle" size={48} color="#fff" />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={() => setSelectedMedia(null)}
                  disabled={isUploading}
                >
                  <FontAwesome name="times" size={16} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* File info */}
              <View style={styles.fileInfo}>
                <Text
                  style={[styles.fileName, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {selectedMedia.fileName}
                </Text>
                <Text style={[styles.fileDetails, { color: colors.mutedForeground }]}>
                  {formatFileSize(selectedMedia.fileSize)}
                  {selectedMedia.width && selectedMedia.height &&
                    ` • ${selectedMedia.width}×${selectedMedia.height}`}
                </Text>
              </View>

              {/* Caption input */}
              <View style={styles.captionSection}>
                <Text style={[styles.captionLabel, { color: colors.foreground }]}>
                  Caption (optional)
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
                  value={selectedMedia.caption}
                  onChangeText={(text) =>
                    setSelectedMedia({ ...selectedMedia, caption: text })
                  }
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
                  <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
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
    fontSize: 13,
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
  previewContainer: {
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  videoIndicator: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  changeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
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
