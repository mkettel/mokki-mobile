import { MediaGrid, MediaViewer, UploadModal } from "@/components/broll";
import { GeometricBackground } from "@/components/GeometricBackground";
import { PageContainer } from "@/components/PageContainer";
import { TopBar } from "@/components/TopBar";
import { typography } from "@/constants/theme";
import {
  deleteBRollMedia,
  getBRollMedia,
  groupMediaByDate,
  updateBRollCaption,
  uploadBRollMedia,
} from "@/lib/api/broll";
import { useAuth } from "@/lib/context/auth";
import { useHouse } from "@/lib/context/house";
import { useColors } from "@/lib/context/theme";
import type {
  BRollMediaGroupedByDay,
  BRollMediaWithProfile,
} from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BRollScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { activeHouse } = useHouse();

  const [mediaItems, setMediaItems] = useState<BRollMediaWithProfile[]>([]);
  const [groupedMedia, setGroupedMedia] = useState<BRollMediaGroupedByDay[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedItem, setSelectedItem] =
    useState<BRollMediaWithProfile | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  const LIMIT = 20;

  const loadMedia = useCallback(
    async (refresh = false) => {
      if (!activeHouse?.id) return;

      const newOffset = refresh ? 0 : offset;
      if (refresh) {
        setIsRefreshing(true);
      } else if (newOffset === 0) {
        setIsLoading(true);
      }

      try {
        const {
          items,
          grouped,
          hasMore: more,
          error,
        } = await getBRollMedia(activeHouse.id, {
          limit: LIMIT,
          offset: newOffset,
        });

        if (error) {
          console.error("Error loading media:", error);
          return;
        }

        if (refresh || newOffset === 0) {
          setMediaItems(items);
          setGroupedMedia(grouped);
        } else {
          const allItems = [...mediaItems, ...items];
          setMediaItems(allItems);
          setGroupedMedia(groupMediaByDate(allItems));
        }
        setHasMore(more);
        setOffset(newOffset + items.length);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeHouse?.id, offset, mediaItems]
  );

  useFocusEffect(
    useCallback(() => {
      loadMedia(true);
    }, [activeHouse?.id])
  );

  const handleRefresh = () => {
    loadMedia(true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadMedia(false);
    }
  };

  const handleUpload = async (media: {
    uri: string;
    base64?: string | null;
    fileName: string;
    mimeType: string;
    fileSize: number;
    width?: number;
    height?: number;
    duration?: number;
    caption: string;
  }) => {
    if (!activeHouse?.id || !user?.id) return;

    const { item, error } = await uploadBRollMedia(
      activeHouse.id,
      user.id,
      {
        uri: media.uri,
        base64: media.base64,
        fileName: media.fileName,
        mimeType: media.mimeType,
        fileSize: media.fileSize,
        width: media.width,
        height: media.height,
        duration: media.duration,
      },
      media.caption || undefined
    );

    if (error) {
      throw error;
    }

    // Refresh to get the new item with profile data
    loadMedia(true);
  };

  const handleItemPress = (item: BRollMediaWithProfile) => {
    setSelectedItem(item);
    setShowViewer(true);
  };

  const handleUpdateCaption = async (
    itemId: string,
    caption: string | null
  ) => {
    const { error } = await updateBRollCaption(itemId, caption);
    if (error) {
      const message = "Failed to update caption";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
      throw error;
    }

    // Update local state
    setMediaItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, caption } : item))
    );
    setGroupedMedia(
      groupMediaByDate(
        mediaItems.map((item) =>
          item.id === itemId ? { ...item, caption } : item
        )
      )
    );

    // Update selected item if it's the one being edited
    if (selectedItem?.id === itemId) {
      setSelectedItem({ ...selectedItem, caption });
    }
  };

  const handleDelete = async (itemId: string) => {
    const { error } = await deleteBRollMedia(itemId);
    if (error) {
      throw error;
    }

    // Remove from local state
    const updatedItems = mediaItems.filter((item) => item.id !== itemId);
    setMediaItems(updatedItems);
    setGroupedMedia(groupMediaByDate(updatedItems));
  };

  const handleCloseViewer = () => {
    setShowViewer(false);
    setSelectedItem(null);
  };

  if (!activeHouse) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <GeometricBackground />
        <TopBar />
        <View style={styles.centered}>
          <FontAwesome name="home" size={48} color={colors.mutedForeground} />
          <Text style={[styles.noHouseText, { color: colors.mutedForeground }]}>
            Select a house to view media
          </Text>
        </View>
      </View>
    );
  }

  return (
    <PageContainer>
      <GeometricBackground />
      <TopBar />

      {/* Header with upload button */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Photos and videos from your adventures
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.uploadButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowUploadModal(true)}
        >
          <FontAwesome name="plus" size={14} color={colors.primaryForeground} />
          <Text
            style={[
              styles.uploadButtonText,
              { color: colors.primaryForeground },
            ]}
          >
            Upload
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading && mediaItems.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading media...
          </Text>
        </View>
      ) : (
        <MediaGrid
          grouped={groupedMedia}
          onItemPress={handleItemPress}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          isLoading={isLoading}
        />
      )}

      {/* Upload Modal */}
      <UploadModal
        visible={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
      />

      {/* Media Viewer */}
      <MediaViewer
        item={selectedItem}
        visible={showViewer}
        currentUserId={user?.id || ""}
        onClose={handleCloseViewer}
        onUpdateCaption={handleUpdateCaption}
        onDelete={handleDelete}
      />
    </PageContainer>
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
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 0,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillax,
    maxWidth: "80%",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  uploadButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 8,
  },
  noHouseText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
    textAlign: "center",
    marginTop: 8,
  },
});
