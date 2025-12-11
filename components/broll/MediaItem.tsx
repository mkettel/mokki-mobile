import { typography } from "@/constants/theme";
import { formatDuration } from "@/lib/api/broll";
import { useColors } from "@/lib/context/theme";
import type { BRollMediaWithProfile } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface MediaItemProps {
  item: BRollMediaWithProfile;
  onPress: (item: BRollMediaWithProfile) => void;
  size?: number;
}

const screenWidth = Dimensions.get("window").width;
const defaultSize = (screenWidth - 48 - 8) / 2; // 2 columns with padding and gap

export function MediaItem({
  item,
  onPress,
  size = defaultSize,
}: MediaItemProps) {
  const colors = useColors();
  const isVideo = item.media_type === "video";

  return (
    <TouchableOpacity
      style={[styles.container, { width: size, height: size }]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.thumbnail_url || item.public_url }}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Video duration badge */}
      {isVideo && item.duration && (
        <View style={styles.durationBadge}>
          <FontAwesome name="play" size={8} color="#fff" />
          <Text style={styles.durationText}>
            {formatDuration(item.duration)}
          </Text>
        </View>
      )}

      {/* Video play icon overlay */}
      {isVideo && (
        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <FontAwesome name="play" size={20} color="#fff" />
          </View>
        </View>
      )}

      {/* Caption gradient overlay */}
      {item.caption && (
        <View style={styles.captionOverlay}>
          <Text style={styles.captionText} numberOfLines={2}>
            {item.caption}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  durationBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  durationText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 4, // Offset for play icon visual centering
  },
  captionOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    paddingTop: 5,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  captionText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
    lineHeight: 14,
  },
});
