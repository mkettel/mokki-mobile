import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useColors } from "@/lib/context/theme";
import { typography } from "@/constants/theme";
import { getReceiptFileType } from "@/lib/api/receipts";

interface ReceiptViewerProps {
  visible: boolean;
  onClose: () => void;
  receiptUrl: string;
  expenseTitle?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function ReceiptViewer({
  visible,
  onClose,
  receiptUrl,
  expenseTitle,
}: ReceiptViewerProps) {
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPdf = receiptUrl.toLowerCase().endsWith(".pdf");

  const handleOpenInBrowser = async () => {
    try {
      const supported = await Linking.canOpenURL(receiptUrl);
      if (supported) {
        await Linking.openURL(receiptUrl);
      } else {
        setError("Cannot open this URL");
      }
    } catch (err) {
      console.error("Error opening URL:", err);
      setError("Failed to open receipt");
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleImageError = (e: any) => {
    setIsLoading(false);
    console.error("Image load error:", e.nativeEvent?.error, "URL:", receiptUrl);
    setError("Failed to load receipt image");
  };

  const renderContent = () => {
    if (isPdf) {
      // PDFs can't be displayed inline in React Native easily
      // Show a placeholder with option to open in browser
      return (
        <View style={styles.pdfContainer}>
          <FontAwesome name="file-pdf-o" size={64} color={colors.destructive} />
          <Text style={[styles.pdfTitle, { color: colors.foreground }]}>
            PDF Receipt
          </Text>
          <Text style={[styles.pdfDescription, { color: colors.mutedForeground }]}>
            PDF files cannot be displayed inline.
          </Text>
          <TouchableOpacity
            style={[styles.openButton, { backgroundColor: colors.primary }]}
            onPress={handleOpenInBrowser}
          >
            <FontAwesome name="external-link" size={16} color="#fff" />
            <Text style={styles.openButtonText}>Open in Browser</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.imageContainer}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <FontAwesome name="exclamation-triangle" size={48} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.foreground }]}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { borderColor: colors.border }]}
              onPress={() => {
                setIsLoading(true);
                setError(null);
              }}
            >
              <Text style={[styles.retryButtonText, { color: colors.foreground }]}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Image
            source={{ uri: receiptUrl }}
            style={styles.image}
            resizeMode="contain"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <FontAwesome name="times" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text
              style={[styles.headerTitle, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {expenseTitle || "Receipt"}
            </Text>
          </View>
          <TouchableOpacity style={styles.actionButton} onPress={handleOpenInBrowser}>
            <FontAwesome name="external-link" size={18} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>{renderContent()}</View>

        {/* Footer hint */}
        {!isPdf && !error && (
          <View style={[styles.footer, { backgroundColor: colors.card }]}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              Pinch to zoom
            </Text>
          </View>
        )}
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
    paddingHorizontal: 8,
    paddingTop: Platform.OS === "ios" ? 50 : 16,
    paddingBottom: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  actionButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    alignItems: "center",
    gap: 16,
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  pdfContainer: {
    alignItems: "center",
    gap: 16,
    padding: 32,
  },
  pdfTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  pdfDescription: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
  },
  openButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  openButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  footer: {
    paddingVertical: 12,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
});
