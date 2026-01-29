import { typography } from "@/constants/theme";
import {
  ADMIN_PING_TEMPLATES,
  type AdminPingType,
  type PingTemplate,
} from "@/constants/adminPingTemplates";
import { sendAdminPingNotification } from "@/lib/api/notifications";
import { useAuth } from "@/lib/context/auth";
import { useColors } from "@/lib/context/theme";
import { FontAwesome } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Button } from "@/components/ui/Button";

interface AdminPingModalProps {
  visible: boolean;
  houseId: string;
  houseName: string;
  onClose: () => void;
}

export function AdminPingModal({
  visible,
  houseId,
  houseName,
  onClose,
}: AdminPingModalProps) {
  const colors = useColors();
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<PingTemplate | null>(
    null
  );
  const [customMessage, setCustomMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleClose = () => {
    setSelectedTemplate(null);
    setCustomMessage("");
    onClose();
  };

  const handleTemplateSelect = (template: PingTemplate) => {
    setSelectedTemplate(template);
    if (template.id !== "custom_announcement") {
      setCustomMessage("");
    }
  };

  const getNotificationBody = (): string => {
    if (!selectedTemplate) return "";
    if (selectedTemplate.id === "custom_announcement") {
      return customMessage.trim();
    }
    return selectedTemplate.defaultBody;
  };

  const canSend = (): boolean => {
    if (!selectedTemplate) return false;
    if (selectedTemplate.id === "custom_announcement") {
      return customMessage.trim().length > 0;
    }
    return true;
  };

  const handleSend = async () => {
    if (!selectedTemplate || !user) return;

    const body = getNotificationBody();
    if (!body) return;

    setIsSending(true);

    const { success, notificationsSent, error } =
      await sendAdminPingNotification({
        houseId,
        adminId: user.id,
        pingType: selectedTemplate.id,
        title: selectedTemplate.title,
        body,
        deepLinkTab: selectedTemplate.deepLinkTab,
      });

    setIsSending(false);

    if (success) {
      const message =
        notificationsSent === 0
          ? "No members to notify"
          : `Notification sent to ${notificationsSent} member${notificationsSent === 1 ? "" : "s"}`;

      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Sent", message);
      }
      handleClose();
    } else {
      const message = error?.message || "Failed to send notification";
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
            Send Notification
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Section: Select Template */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            SELECT TYPE
          </Text>

          <View style={styles.templateList}>
            {ADMIN_PING_TEMPLATES.map((template) => {
              const isSelected = selectedTemplate?.id === template.id;
              return (
                <TouchableOpacity
                  key={template.id}
                  style={[
                    styles.templateCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => handleTemplateSelect(template)}
                >
                  <View
                    style={[
                      styles.templateIcon,
                      {
                        backgroundColor: isSelected
                          ? colors.primary + "20"
                          : colors.muted,
                      },
                    ]}
                  >
                    <FontAwesome
                      name={template.icon as any}
                      size={18}
                      color={isSelected ? colors.primary : colors.foreground}
                    />
                  </View>
                  <View style={styles.templateContent}>
                    <Text
                      style={[
                        styles.templateTitle,
                        { color: colors.foreground },
                      ]}
                    >
                      {template.title}
                    </Text>
                    {template.defaultBody ? (
                      <Text
                        style={[
                          styles.templateBody,
                          { color: colors.mutedForeground },
                        ]}
                        numberOfLines={1}
                      >
                        {template.defaultBody}
                      </Text>
                    ) : (
                      <Text
                        style={[
                          styles.templateBody,
                          {
                            color: colors.mutedForeground,
                            fontStyle: "italic",
                          },
                        ]}
                      >
                        Write your own message
                      </Text>
                    )}
                  </View>
                  {isSelected && (
                    <FontAwesome
                      name="check-circle"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Message Input */}
          {selectedTemplate?.id === "custom_announcement" && (
            <>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.foreground, marginTop: 24 },
                ]}
              >
                YOUR MESSAGE
              </Text>
              <TextInput
                style={[
                  styles.customInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="Type your announcement..."
                placeholderTextColor={colors.mutedForeground}
                value={customMessage}
                onChangeText={setCustomMessage}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
              <Text
                style={[styles.charCount, { color: colors.mutedForeground }]}
              >
                {customMessage.length}/500
              </Text>
            </>
          )}

          {/* Preview */}
          {selectedTemplate && canSend() && (
            <>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.foreground, marginTop: 24 },
                ]}
              >
                PREVIEW
              </Text>
              <View
                style={[
                  styles.previewCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.previewHeader}>
                  <View
                    style={[
                      styles.previewAppIcon,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={styles.previewAppIconText}>M</Text>
                  </View>
                  <Text
                    style={[
                      styles.previewAppName,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Mokki
                  </Text>
                  <Text
                    style={[
                      styles.previewTime,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    now
                  </Text>
                </View>
                <Text
                  style={[styles.previewTitle, { color: colors.foreground }]}
                >
                  {selectedTemplate.title}
                </Text>
                <Text
                  style={[styles.previewBody, { color: colors.foreground }]}
                  numberOfLines={3}
                >
                  {getNotificationBody()}
                </Text>
              </View>
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button variant="outline" onPress={handleClose} style={styles.button}>
            Cancel
          </Button>
          <Button
            onPress={handleSend}
            disabled={!canSend() || isSending}
            loading={isSending}
            style={styles.button}
          >
            {isSending ? "Sending..." : "Send"}
          </Button>
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
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxSemibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  templateList: {
    gap: 8,
  },
  templateCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  templateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  templateContent: {
    flex: 1,
  },
  templateTitle: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 2,
  },
  templateBody: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  customInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "right",
    marginTop: 4,
  },
  previewCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  previewAppIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  previewAppIconText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxBold,
  },
  previewAppName: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
    flex: 1,
  },
  previewTime: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
  previewTitle: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxSemibold,
    marginBottom: 4,
  },
  previewBody: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
  },
});
