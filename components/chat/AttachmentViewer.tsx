import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { typography } from "@/constants/theme";
import { formatFileSize, formatDuration } from "@/lib/api/broll";
import type { MessageAttachment } from "@/types/database";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface AttachmentViewerProps {
  visible: boolean;
  attachments: MessageAttachment[];
  initialIndex: number;
  onClose: () => void;
}

export function AttachmentViewer({
  visible,
  attachments,
  initialIndex,
  onClose,
}: AttachmentViewerProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  const currentAttachment = attachments[currentIndex];
  const isVideo = currentAttachment?.media_type === "video";

  // Video player for video attachments
  const player = useVideoPlayer(
    isVideo && currentAttachment ? currentAttachment.public_url : null,
    (player) => {
      player.loop = false;
    }
  );

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderItem = ({ item }: { item: MessageAttachment }) => {
    const isItemVideo = item.media_type === "video";

    if (isItemVideo) {
      return (
        <View style={styles.mediaWrapper}>
          <VideoPlayer url={item.public_url} />
        </View>
      );
    }

    return (
      <View style={styles.mediaWrapper}>
        <Image
          source={{ uri: item.public_url }}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    );
  };

  if (!visible || attachments.length === 0) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="times" size={24} color="#fff" />
          </TouchableOpacity>
          {attachments.length > 1 && (
            <Text style={styles.counter}>
              {currentIndex + 1} / {attachments.length}
            </Text>
          )}
          <View style={styles.headerSpacer} />
        </View>

        {/* Media Gallery */}
        <FlatList
          ref={flatListRef}
          data={attachments}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />

        {/* Footer Info */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.fileName} numberOfLines={1}>
            {currentAttachment?.file_name}
          </Text>
          <Text style={styles.fileInfo}>
            {currentAttachment && formatFileSize(currentAttachment.file_size)}
            {currentAttachment?.width &&
              currentAttachment?.height &&
              ` • ${currentAttachment.width}×${currentAttachment.height}`}
            {isVideo &&
              currentAttachment?.duration &&
              ` • ${formatDuration(currentAttachment.duration)}`}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

// Separate video player component to properly handle the hook
function VideoPlayer({ url }: { url: string }) {
  const player = useVideoPlayer(url, (player) => {
    player.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={styles.video}
      allowsPictureInPicture
      nativeControls
      contentFit="contain"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    color: "#fff",
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  headerSpacer: {
    width: 44,
  },
  mediaWrapper: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: screenWidth,
    height: screenHeight * 0.7,
  },
  video: {
    width: screenWidth,
    height: screenHeight * 0.7,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  fileName: {
    color: "#fff",
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 4,
  },
  fileInfo: {
    color: "#888",
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
});
