import { typography } from "@/constants/theme";
import { createInviteLink } from "@/lib/api/members";
import { useColors } from "@/lib/context/theme";
import { FontAwesome } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface InviteModalProps {
  visible: boolean;
  houseId: string;
  houseName: string;
  onClose: () => void;
  onInviteSent: () => void;
}

export function InviteModal({
  visible,
  houseId,
  houseName,
  onClose,
  onInviteSent,
}: InviteModalProps) {
  const colors = useColors();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Generate invite code when modal opens
  useEffect(() => {
    if (visible && !inviteCode) {
      generateInviteCode();
    }
  }, [visible]);

  const generateInviteCode = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { inviteCode: code, error: createError } = await createInviteLink(houseId);

      if (createError) {
        setError(createError.message);
        return;
      }

      setInviteCode(code);
    } catch (err) {
      setError("Failed to create invite link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setInviteCode(null);
    setError(null);
    setCopied(false);
    onClose();
  };

  const getInviteUrl = () => {
    return `https://mokkiski.com/invite/${inviteCode}`;
  };

  const handleShare = async () => {
    if (!inviteCode) return;

    const message = `Join "${houseName}" on Mökki!\n\n${getInviteUrl()}\n\nOr use invite code: ${inviteCode}`;

    try {
      await Share.share({
        message,
        title: `Join ${houseName} on Mökki`,
      });
      onInviteSent();
    } catch (err) {
      // User cancelled or error
    }
  };

  const handleCopyLink = async () => {
    if (!inviteCode) return;

    try {
      await Clipboard.setStringAsync(getInviteUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const message = "Failed to copy link";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
    }
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;

    try {
      await Clipboard.setStringAsync(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const message = "Failed to copy code";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
    }
  };

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
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <FontAwesome name="times" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Invite Member
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.foreground} />
              <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                Creating invite link...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <View style={[styles.errorIcon, { backgroundColor: colors.destructive + "20" }]}>
                <FontAwesome name="exclamation-circle" size={32} color={colors.destructive} />
              </View>
              <Text style={[styles.errorTitle, { color: colors.foreground }]}>
                Something went wrong
              </Text>
              <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
                {error}
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                onPress={generateInviteCode}
              >
                <FontAwesome name="refresh" size={14} color={colors.primaryForeground} />
                <Text style={[styles.retryButtonText, { color: colors.primaryForeground }]}>
                  Try Again
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.iconContainer}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}>
                  <FontAwesome name="link" size={32} color={colors.primary} />
                </View>
              </View>

              <Text style={[styles.title, { color: colors.foreground }]}>
                Invite to {houseName}
              </Text>
              <Text style={[styles.description, { color: colors.mutedForeground }]}>
                Share this invite link with anyone you want to join your house.
              </Text>

              {/* Invite Link Box */}
              <View style={[styles.linkBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.linkText, { color: colors.foreground }]} numberOfLines={1}>
                  {getInviteUrl()}
                </Text>
                <TouchableOpacity
                  style={[styles.copyButton, { backgroundColor: colors.muted }]}
                  onPress={handleCopyLink}
                >
                  <FontAwesome
                    name={copied ? "check" : "copy"}
                    size={14}
                    color={copied ? "#16a34a" : colors.foreground}
                  />
                </TouchableOpacity>
              </View>

              {/* Invite Code */}
              <View style={styles.codeSection}>
                <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>
                  Or share the code:
                </Text>
                <TouchableOpacity
                  style={[styles.codeBox, { backgroundColor: colors.muted }]}
                  onPress={handleCopyCode}
                >
                  <Text style={[styles.codeText, { color: colors.foreground }]}>
                    {inviteCode}
                  </Text>
                  <FontAwesome
                    name={copied ? "check" : "copy"}
                    size={12}
                    color={copied ? "#16a34a" : colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>

              {/* Share Button */}
              <TouchableOpacity
                style={[styles.shareButton, { backgroundColor: colors.primary }]}
                onPress={handleShare}
              >
                <FontAwesome name="share" size={16} color={colors.primaryForeground} />
                <Text style={[styles.shareButtonText, { color: colors.primaryForeground }]}>
                  Share Invite
                </Text>
              </TouchableOpacity>

              <Text style={[styles.note, { color: colors.mutedForeground }]}>
                This invite link expires in 7 days. Anyone with the link can join your house.
              </Text>
            </>
          )}
        </View>
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
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  errorText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontFamily: typography.fontFamily.chillaxBold,
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  linkBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
    marginBottom: 16,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  copyButton: {
    padding: 10,
    borderRadius: 6,
  },
  codeSection: {
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  codeLabel: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 10,
  },
  codeText: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
    letterSpacing: 2,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  shareButtonText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  note: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
    lineHeight: 18,
  },
});
