import { typography } from "@/constants/theme";
import { sendInvite } from "@/lib/api/members";
import { useColors } from "@/lib/context/theme";
import { FontAwesome } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetState = () => {
    setEmail("");
    setError(null);
    setSuccess(false);
    setIsSending(false);
  };

  const handleClose = () => {
    if (!isSending) {
      resetState();
      onClose();
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSendInvite = async () => {
    Keyboard.dismiss();
    setError(null);

    if (!email.trim()) {
      setError("Please enter an email address");
      return;
    }

    if (!isValidEmail(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSending(true);

    try {
      const { success, alreadyMember, error: sendError } = await sendInvite(
        houseId,
        email.trim()
      );

      if (sendError) {
        setError(sendError.message);
        return;
      }

      if (success) {
        setSuccess(true);
        onInviteSent();

        // Show share option for pending invites
        if (!alreadyMember && Platform.OS !== "web") {
          setTimeout(() => {
            Share.share({
              message: `You've been invited to join "${houseName}" on Mökki! Download the app and sign up with ${email.trim()} to accept.`,
              title: `Join ${houseName} on Mökki`,
            }).catch(() => {});
          }, 500);
        }

        // Close modal after short delay
        setTimeout(() => {
          handleClose();
        }, 1500);
      }
    } catch (err) {
      setError("Failed to send invitation. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              disabled={isSending}
            >
              <FontAwesome name="times" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Invite Member
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            {success ? (
              <View style={styles.successContainer}>
                <View style={[styles.successIcon, { backgroundColor: colors.primary + "20" }]}>
                  <FontAwesome name="check" size={32} color={colors.primary} />
                </View>
                <Text style={[styles.successTitle, { color: colors.foreground }]}>
                  Invitation Sent!
                </Text>
                <Text style={[styles.successText, { color: colors.mutedForeground }]}>
                  {email.trim()} has been invited to join {houseName}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.iconContainer}>
                  <View style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}>
                    <FontAwesome name="user-plus" size={32} color={colors.primary} />
                  </View>
                </View>

                <Text style={[styles.title, { color: colors.foreground }]}>
                  Invite to {houseName}
                </Text>
                <Text style={[styles.description, { color: colors.mutedForeground }]}>
                  Enter the email address of the person you want to invite.
                  They'll receive an invitation to join your house.
                </Text>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.foreground }]}>
                    Email Address
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.card,
                        borderColor: error ? colors.destructive : colors.border,
                        color: colors.foreground,
                      },
                    ]}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setError(null);
                    }}
                    placeholder="friend@example.com"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    editable={!isSending}
                  />
                  {error && (
                    <Text style={[styles.errorText, { color: colors.destructive }]}>
                      {error}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    { backgroundColor: colors.primary },
                    isSending && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSendInvite}
                  disabled={isSending || !email.trim()}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <FontAwesome name="paper-plane" size={16} color="#fff" />
                      <Text style={styles.sendButtonText}>Send Invitation</Text>
                    </>
                  )}
                </TouchableOpacity>

                <Text style={[styles.note, { color: colors.mutedForeground }]}>
                  If they already have a Mökki account, they'll be added
                  automatically. Otherwise, they'll need to sign up first.
                </Text>
              </>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
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
  inputContainer: {
    marginBottom: 20,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: typography.fontFamily.chillax,
  },
  errorText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  note: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
    lineHeight: 18,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 22,
    fontFamily: typography.fontFamily.chillaxBold,
  },
  successText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
  },
});
