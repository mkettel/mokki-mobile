import { typography } from "@/constants/theme";
import type { ChatMessageWithProfile } from "@/lib/api/chat";
import { getMessageAttachments } from "@/lib/api/chat";
import { useColors } from "@/lib/context/theme";
import type { MessageAttachment } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import { format, isToday, isYesterday } from "date-fns";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

const SCREEN_WIDTH = Dimensions.get("window").width;
const MAX_IMAGE_WIDTH = SCREEN_WIDTH * 0.6;
const MAX_IMAGE_HEIGHT = 200;

interface MessageBubbleProps {
  message: ChatMessageWithProfile;
  isOwnMessage: boolean;
  showAvatar?: boolean;
  showName?: boolean;
  onAttachmentPress?: (
    attachment: MessageAttachment,
    allAttachments: MessageAttachment[]
  ) => void;
}

// Separate component for attachment images with loading state
function AttachmentImage({
  attachment,
  imageUrl,
  dimensions,
  isVideo,
  index,
  onPress,
}: {
  attachment: MessageAttachment;
  imageUrl: string;
  dimensions: { width: number; height: number };
  isVideo: boolean;
  index: number;
  onPress: () => void;
}) {
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(true);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.attachmentContainer,
        { width: dimensions.width, height: dimensions.height },
        index > 0 && styles.attachmentMarginTop,
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {isLoading && (
        <View
          style={[
            styles.attachmentLoader,
            { backgroundColor: colors.muted },
          ]}
        >
          <ActivityIndicator size="small" color={colors.mutedForeground} />
        </View>
      )}
      <Animated.View
        entering={FadeIn.duration(200)}
        style={StyleSheet.absoluteFill}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.attachmentImage}
          resizeMode="cover"
          onLoadEnd={() => setIsLoading(false)}
        />
      </Animated.View>
      {isVideo && !isLoading && (
        <View style={styles.videoOverlay}>
          <View style={styles.playButton}>
            <FontAwesome name="play" size={20} color="#fff" />
          </View>
          {attachment.duration && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                {formatDuration(attachment.duration)}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function MessageBubble({
  message,
  isOwnMessage,
  showAvatar = true,
  showName = true,
  onAttachmentPress,
}: MessageBubbleProps) {
  const colors = useColors();
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);

  // Fetch attachments if message has them
  useEffect(() => {
    if (message.has_attachments) {
      getMessageAttachments(message.id)
        .then(({ attachments: atts, error }) => {
          if (!error) {
            setAttachments(atts);
          }
        })
        .catch((err) => {
          console.error("Failed to load attachments:", err);
        });
    }
  }, [message.id, message.has_attachments]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "h:mm a")}`;
    }
    return format(date, "MMM d, h:mm a");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = message.profiles?.display_name || "Unknown";
  const avatarUrl = message.profiles?.avatar_url;
  const hasText = message.content && message.content.trim().length > 0;
  const hasAttachments = attachments.length > 0;

  // Calculate image dimensions maintaining aspect ratio
  const getImageDimensions = (width?: number, height?: number) => {
    if (!width || !height) {
      return { width: MAX_IMAGE_WIDTH, height: MAX_IMAGE_HEIGHT };
    }

    const aspectRatio = width / height;
    let displayWidth = Math.min(width, MAX_IMAGE_WIDTH);
    let displayHeight = displayWidth / aspectRatio;

    if (displayHeight > MAX_IMAGE_HEIGHT) {
      displayHeight = MAX_IMAGE_HEIGHT;
      displayWidth = displayHeight * aspectRatio;
    }

    return { width: displayWidth, height: displayHeight };
  };

  const renderAttachment = (attachment: MessageAttachment, index: number) => {
    const dimensions = getImageDimensions(
      attachment.width || undefined,
      attachment.height || undefined
    );
    const isVideo = attachment.media_type === "video";
    const imageUrl =
      isVideo && attachment.thumbnail_url
        ? attachment.thumbnail_url
        : attachment.public_url;

    return (
      <AttachmentImage
        key={attachment.id}
        attachment={attachment}
        imageUrl={imageUrl}
        dimensions={dimensions}
        isVideo={isVideo}
        index={index}
        onPress={() => onAttachmentPress?.(attachment, attachments)}
      />
    );
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[
        styles.container,
        isOwnMessage ? styles.containerOwn : styles.containerOther,
      ]}
    >
      {/* Avatar for other users */}
      {!isOwnMessage && showAvatar && (
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: colors.muted },
              ]}
            >
              <Text
                style={[
                  styles.avatarInitials,
                  { color: colors.mutedForeground },
                ]}
              >
                {getInitials(displayName)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Message content */}
      <View
        style={[
          styles.bubbleContainer,
          isOwnMessage
            ? styles.bubbleContainerOwn
            : styles.bubbleContainerOther,
        ]}
      >
        {/* Sender name for other users */}
        {!isOwnMessage && showName && (
          <Text style={[styles.senderName, { color: colors.primary }]}>
            {displayName}
          </Text>
        )}

        {/* Attachments */}
        {hasAttachments && (
          <View
            style={[
              styles.attachmentsWrapper,
              !hasText && styles.attachmentsOnly,
            ]}
          >
            {attachments.map((attachment, index) =>
              renderAttachment(attachment, index)
            )}
          </View>
        )}

        {/* Message bubble (text) */}
        {hasText && (
          <View
            style={[
              styles.bubble,
              isOwnMessage
                ? [styles.bubbleOwn, { backgroundColor: colors.primary }]
                : [styles.bubbleOther, { backgroundColor: colors.muted }],
              hasAttachments && styles.bubbleWithAttachments,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                {
                  color: isOwnMessage ? "#FFFFFF" : colors.foreground,
                },
              ]}
            >
              {message.content}
            </Text>
          </View>
        )}

        {/* Timestamp */}
        <Text
          style={[
            styles.timestamp,
            { color: colors.mutedForeground },
            isOwnMessage ? styles.timestampOwn : styles.timestampOther,
          ]}
        >
          {formatTime(message.created_at)}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  containerOwn: {
    justifyContent: "flex-end",
  },
  containerOther: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: "flex-end",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  bubbleContainer: {
    maxWidth: "75%",
  },
  bubbleContainerOwn: {
    alignItems: "flex-end",
  },
  bubbleContainerOther: {
    alignItems: "flex-start",
  },
  senderName: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 2,
    marginLeft: 4,
  },
  attachmentsWrapper: {
    marginBottom: 4,
  },
  attachmentsOnly: {
    marginBottom: 0,
  },
  attachmentContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  attachmentMarginTop: {
    marginTop: 4,
  },
  attachmentImage: {
    width: "100%",
    height: "100%",
  },
  attachmentLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleOwn: {
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    borderBottomLeftRadius: 4,
  },
  bubbleWithAttachments: {
    marginTop: 4,
  },
  messageText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 4,
  },
  timestampOwn: {
    marginRight: 4,
  },
  timestampOther: {
    marginLeft: 4,
  },
});
