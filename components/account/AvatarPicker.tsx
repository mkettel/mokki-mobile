import { typography } from "@/constants/theme";
import { uploadAvatar, removeAvatar, ALLOWED_AVATAR_TYPES } from "@/lib/api/profile";
import { useColors } from "@/lib/context/theme";
import { FontAwesome } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface AvatarPickerProps {
  avatarUrl: string | null;
  displayName: string | null;
  onAvatarChange: (newAvatarUrl: string | null) => void;
}

export function AvatarPicker({
  avatarUrl,
  displayName,
  onAvatarChange,
}: AvatarPickerProps) {
  const colors = useColors();
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const getInitials = () => {
    if (!displayName) return "?";
    return displayName.charAt(0).toUpperCase();
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType || "image/jpeg";

      if (!ALLOWED_AVATAR_TYPES.includes(mimeType)) {
        const message = "Please select a JPEG, PNG, WebP, or GIF image";
        if (Platform.OS === "web") {
          window.alert(message);
        } else {
          Alert.alert("Invalid Image", message);
        }
        return;
      }

      setIsUploading(true);
      try {
        const { avatarUrl: newUrl, error } = await uploadAvatar(asset.uri, mimeType);
        if (error) {
          throw error;
        }
        onAvatarChange(newUrl);
      } catch (error) {
        console.error("Upload error:", error);
        const message = error instanceof Error ? error.message : "Failed to upload image";
        if (Platform.OS === "web") {
          window.alert(message);
        } else {
          Alert.alert("Upload Error", message);
        }
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemove = async () => {
    const doRemove = async () => {
      setIsRemoving(true);
      try {
        const { error } = await removeAvatar();
        if (error) {
          throw error;
        }
        onAvatarChange(null);
      } catch (error) {
        console.error("Remove error:", error);
        const message = "Failed to remove avatar";
        if (Platform.OS === "web") {
          window.alert(message);
        } else {
          Alert.alert("Error", message);
        }
      } finally {
        setIsRemoving(false);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Remove your profile photo?")) {
        doRemove();
      }
    } else {
      Alert.alert("Remove Photo", "Remove your profile photo?", [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: doRemove },
      ]);
    }
  };

  const isLoading = isUploading || isRemoving;

  return (
    <View style={styles.container}>
      {/* Avatar display */}
      <View style={[styles.avatarContainer, { borderColor: colors.border }]}>
        {isLoading ? (
          <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.initials, { color: colors.primaryForeground }]}>
              {getInitials()}
            </Text>
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={pickImage}
          disabled={isLoading}
        >
          <FontAwesome name="camera" size={14} color={colors.primaryForeground} />
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
            {avatarUrl ? "Change Photo" : "Add Photo"}
          </Text>
        </TouchableOpacity>

        {avatarUrl && (
          <TouchableOpacity
            style={[styles.button, styles.removeButton, { borderColor: colors.border }]}
            onPress={handleRemove}
            disabled={isLoading}
          >
            <FontAwesome name="trash-o" size={14} color={colors.destructive} />
            <Text style={[styles.removeButtonText, { color: colors.destructive }]}>
              Remove
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 16,
  },
  avatarContainer: {
    borderRadius: 80,
    borderWidth: 3,
    padding: 3,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: 48,
    fontFamily: typography.fontFamily.chillaxBold,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  removeButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  removeButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
});
