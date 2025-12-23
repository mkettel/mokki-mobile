import React, { useState, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  Alert,
} from "react-native";
import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import { FontAwesome } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { PendingAttachment } from "@/lib/api/chat";
import { formatFileSize, MAX_IMAGE_SIZE, MAX_VIDEO_SIZE } from "@/lib/api/broll";

interface MessageInputProps {
  onSend: (content: string, attachments?: PendingAttachment[]) => Promise<boolean>;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageInput({
  onSend,
  placeholder = "Type a message...",
  disabled = false,
}: MessageInputProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const inputRef = useRef<TextInput>(null);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && attachments.length === 0) || isSending || disabled) return;

    setIsSending(true);
    const success = await onSend(trimmedMessage, attachments.length > 0 ? attachments : undefined);

    if (success) {
      setMessage("");
      setAttachments([]);
    }
    setIsSending(false);
  };

  const pickMedia = async () => {
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
      allowsMultipleSelection: true,
      quality: 0.8,
      exif: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newAttachments: PendingAttachment[] = [];

      for (const asset of result.assets) {
        const isVideo = asset.type === "video" || asset.mimeType?.startsWith("video/");
        const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

        if (asset.fileSize && asset.fileSize > maxSize) {
          Alert.alert(
            "File Too Large",
            `${asset.fileName || "File"} is too large. Max size: ${formatFileSize(maxSize)}`
          );
          continue;
        }

        const fileName = asset.fileName || `media_${Date.now()}.${isVideo ? "mp4" : "jpg"}`;
        const mimeType = asset.mimeType || (isVideo ? "video/mp4" : "image/jpeg");

        newAttachments.push({
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          uri: asset.uri,
          fileName,
          mimeType,
          fileSize: asset.fileSize || 0,
          width: asset.width,
          height: asset.height,
          duration: asset.duration ? Math.round(asset.duration / 1000) : undefined,
          type: isVideo ? "video" : "image",
        });
      }

      if (newAttachments.length > 0) {
        setAttachments((prev) => [...prev, ...newAttachments]);
      }
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
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const isVideo = asset.type === "video" || asset.mimeType?.startsWith("video/");
      const fileName = `camera_${Date.now()}.${isVideo ? "mp4" : "jpg"}`;
      const mimeType = asset.mimeType || (isVideo ? "video/mp4" : "image/jpeg");

      setAttachments((prev) => [
        ...prev,
        {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          uri: asset.uri,
          fileName,
          mimeType,
          fileSize: asset.fileSize || 0,
          width: asset.width,
          height: asset.height,
          duration: asset.duration ? Math.round(asset.duration / 1000) : undefined,
          type: isVideo ? "video" : "image",
        },
      ]);
    }
  };

  const showAttachmentOptions = () => {
    if (Platform.OS === "web") {
      pickMedia();
    } else {
      Alert.alert("Add Attachment", "Choose how to add media", [
        { text: "Photo Library", onPress: pickMedia },
        { text: "Take Photo", onPress: takePhoto },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const canSend = (message.trim().length > 0 || attachments.length > 0) && !isSending && !disabled;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        {/* Attachment Preview Strip */}
        {attachments.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.attachmentStrip}
            contentContainerStyle={styles.attachmentStripContent}
          >
            {attachments.map((attachment) => (
              <View key={attachment.id} style={styles.attachmentPreview}>
                <Image
                  source={{ uri: attachment.uri }}
                  style={styles.attachmentImage}
                />
                {attachment.type === "video" && (
                  <View style={styles.videoOverlay}>
                    <FontAwesome name="play-circle" size={20} color="#fff" />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeAttachment(attachment.id)}
                  disabled={isSending}
                >
                  <FontAwesome name="times" size={10} color="#fff" />
                </TouchableOpacity>
                <Text
                  style={[styles.attachmentSize, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {formatFileSize(attachment.fileSize)}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Input Row */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.muted,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Attachment Button */}
          <TouchableOpacity
            style={styles.attachButton}
            onPress={showAttachmentOptions}
            disabled={disabled || isSending}
          >
            <FontAwesome
              name="plus"
              size={18}
              color={disabled || isSending ? colors.mutedForeground : colors.foreground}
            />
          </TouchableOpacity>

          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                color: colors.foreground,
              },
            ]}
            placeholder={placeholder}
            placeholderTextColor={colors.mutedForeground}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={2000}
            editable={!disabled}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: canSend ? colors.primary : colors.muted,
              },
            ]}
            onPress={handleSend}
            disabled={!canSend}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <FontAwesome
                name="send"
                size={16}
                color={canSend ? colors.primaryForeground : colors.mutedForeground}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  attachmentStrip: {
    marginBottom: 8,
  },
  attachmentStripContent: {
    paddingHorizontal: 4,
    gap: 8,
    flexDirection: "row",
  },
  attachmentPreview: {
    width: 64,
    alignItems: "center",
  },
  attachmentImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeButton: {
    position: "absolute",
    top: -4,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentSize: {
    fontSize: 9,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 4,
    paddingRight: 4,
    paddingVertical: 4,
    minHeight: 44,
  },
  attachButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
    maxHeight: 100,
    paddingVertical: 8,
    paddingRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
