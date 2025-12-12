import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { FontAwesome } from "@expo/vector-icons";
import { useColors } from "@/lib/context/theme";
import { typography } from "@/constants/theme";
import {
  validateReceiptFile,
  getReceiptFileType,
  ALLOWED_RECEIPT_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/api/receipts";

export type ReceiptFile = {
  uri: string;
  mimeType: string;
  fileSize: number;
  fileName: string;
};

interface ReceiptPickerProps {
  value: ReceiptFile | null;
  onChange: (file: ReceiptFile | null) => void;
  existingUrl?: string | null;
  disabled?: boolean;
}

export function ReceiptPicker({
  value,
  onChange,
  existingUrl,
  disabled = false,
}: ReceiptPickerProps) {
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = async () => {
    if (Platform.OS !== "web") {
      const { status: cameraStatus } =
        await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraStatus !== "granted" && libraryStatus !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to camera or photos to add receipts."
        );
        return false;
      }
    }
    return true;
  };

  const pickFromLibrary = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const mimeType = asset.mimeType || "image/jpeg";
        const fileSize = asset.fileSize || 0;

        const validation = validateReceiptFile({ mimeType, fileSize });
        if (!validation.valid) {
          Alert.alert("Invalid File", validation.error);
          return;
        }

        onChange({
          uri: asset.uri,
          mimeType,
          fileSize,
          fileName: asset.fileName || `receipt_${Date.now()}.jpg`,
        });
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const mimeType = asset.mimeType || "image/jpeg";
        const fileSize = asset.fileSize || 0;

        const validation = validateReceiptFile({ mimeType, fileSize });
        if (!validation.valid) {
          Alert.alert("Invalid File", validation.error);
          return;
        }

        onChange({
          uri: asset.uri,
          mimeType,
          fileSize,
          fileName: asset.fileName || `receipt_${Date.now()}.jpg`,
        });
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const showOptions = () => {
    if (Platform.OS === "web") {
      pickFromLibrary();
      return;
    }

    Alert.alert("Add Receipt", "Choose how to add your receipt", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Library", onPress: pickFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleRemove = () => {
    if (Platform.OS === "web") {
      onChange(null);
      return;
    }

    Alert.alert("Remove Receipt", "Are you sure you want to remove this receipt?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => onChange(null),
      },
    ]);
  };

  const hasReceipt = value || existingUrl;
  const displayUri = value?.uri || existingUrl;
  const isPdf = value
    ? getReceiptFileType(value.mimeType) === "pdf"
    : existingUrl?.toLowerCase().endsWith(".pdf");

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          Processing...
        </Text>
      </View>
    );
  }

  if (hasReceipt) {
    return (
      <View style={styles.container}>
        <View style={[styles.previewContainer, { borderColor: colors.border }]}>
          {isPdf ? (
            <View style={[styles.pdfPreview, { backgroundColor: colors.muted }]}>
              <FontAwesome name="file-pdf-o" size={32} color={colors.destructive} />
              <Text style={[styles.pdfText, { color: colors.foreground }]}>
                PDF Receipt
              </Text>
            </View>
          ) : displayUri ? (
            <Image source={{ uri: displayUri }} style={styles.previewImage} />
          ) : null}

          {!disabled && (
            <TouchableOpacity
              style={[styles.removeButton, { backgroundColor: colors.destructive }]}
              onPress={handleRemove}
            >
              <FontAwesome name="trash" size={14} color="#fff" />
            </TouchableOpacity>
          )}

          {value && !existingUrl && (
            <View style={[styles.newBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.newBadgeText}>New</Text>
            </View>
          )}
        </View>

        {!disabled && (
          <TouchableOpacity
            style={[styles.changeButton, { borderColor: colors.border }]}
            onPress={showOptions}
          >
            <FontAwesome name="refresh" size={12} color={colors.mutedForeground} />
            <Text style={[styles.changeButtonText, { color: colors.mutedForeground }]}>
              Change Receipt
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.addButton,
        { backgroundColor: colors.muted, borderColor: colors.border },
        disabled && styles.disabled,
      ]}
      onPress={showOptions}
      disabled={disabled}
    >
      <FontAwesome name="camera" size={20} color={colors.mutedForeground} />
      <Text style={[styles.addButtonText, { color: colors.mutedForeground }]}>
        Add Receipt
      </Text>
      <Text style={[styles.addButtonHint, { color: colors.mutedForeground }]}>
        JPEG, PNG, WebP, or PDF (max 10MB)
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  loadingContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  previewContainer: {
    position: "relative",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  pdfPreview: {
    width: "100%",
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  pdfText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  newBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: typography.fontFamily.chillaxMedium,
    textTransform: "uppercase",
  },
  changeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  changeButtonText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  addButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  addButtonHint: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
  },
  disabled: {
    opacity: 0.5,
  },
});
