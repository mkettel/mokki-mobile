import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useColors } from "@/lib/context/theme";
import { typography } from "@/constants/theme";
import { formatTimeSlot, SESSION_STATUS_CONFIG } from "@/constants/sessionBooking";
import { respondToRequest } from "@/lib/api/sessionBooking";
import { sendSessionResponseNotification } from "@/lib/api/notifications";
import type { SessionRequestWithProfiles } from "@/types/database";

interface SessionRequestsSectionProps {
  requests: SessionRequestWithProfiles[];
  houseName?: string;
  adminName?: string;
  onRequestHandled: () => void;
}

export function SessionRequestsSection({
  requests,
  houseName,
  adminName,
  onRequestHandled,
}: SessionRequestsSectionProps) {
  const colors = useColors();
  const [isExpanded, setIsExpanded] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const sendNotification = async (
    request: SessionRequestWithProfiles,
    status: "accepted" | "declined"
  ) => {
    if (!houseName || !adminName) return;

    try {
      await sendSessionResponseNotification({
        requesterId: request.requester_id,
        adminName,
        status,
        requestedDate: request.requested_date,
        requestedTime: formatTimeSlot(request.requested_time),
        houseName,
      });
    } catch (err) {
      console.error("Failed to send session response notification:", err);
    }
  };

  const handleAccept = async (requestId: string) => {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    setProcessingId(requestId);
    const { error } = await respondToRequest(requestId, "accepted");
    setProcessingId(null);

    if (error) {
      Alert.alert("Error", "Failed to accept request. Please try again.");
    } else {
      // Send notification to requester
      sendNotification(request, "accepted");
      onRequestHandled();
    }
  };

  const handleDecline = async (requestId: string) => {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    Alert.alert(
      "Decline Request",
      "Are you sure you want to decline this session request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            setProcessingId(requestId);
            const { error } = await respondToRequest(requestId, "declined");
            setProcessingId(null);

            if (error) {
              Alert.alert("Error", "Failed to decline request. Please try again.");
            } else {
              // Send notification to requester
              sendNotification(request, "declined");
              onRequestHandled();
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  if (requests.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.headerLeft}>
          <FontAwesome name="calendar-check-o" size={16} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Session Requests
          </Text>
          {pendingCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>
                {pendingCount}
              </Text>
            </View>
          )}
        </View>
        <FontAwesome
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>

      {/* Content */}
      {isExpanded && (
        <View style={styles.content}>
          {requests.map((request) => {
            const profile = request.requester;
            const displayName =
              profile.display_name || profile.email.split("@")[0];
            const initial = displayName.charAt(0).toUpperCase();
            const isProcessing = processingId === request.id;
            const isPending = request.status === "pending";

            return (
              <View
                key={request.id}
                style={[
                  styles.requestCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* Request Info */}
                <View style={styles.requestInfo}>
                  {profile.avatar_url ? (
                    <Image
                      source={{ uri: profile.avatar_url }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: colors.muted },
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarText,
                          { color: colors.foreground },
                        ]}
                      >
                        {initial}
                      </Text>
                    </View>
                  )}

                  <View style={styles.requestDetails}>
                    <Text style={[styles.requesterName, { color: colors.foreground }]}>
                      {displayName}
                    </Text>
                    <View style={styles.dateTimeRow}>
                      <FontAwesome
                        name="calendar"
                        size={12}
                        color={colors.mutedForeground}
                      />
                      <Text style={[styles.dateTimeText, { color: colors.foreground }]}>
                        {formatDate(request.requested_date)}
                      </Text>
                      <FontAwesome
                        name="clock-o"
                        size={12}
                        color={colors.mutedForeground}
                      />
                      <Text style={[styles.dateTimeText, { color: colors.foreground }]}>
                        {formatTimeSlot(request.requested_time)}
                      </Text>
                    </View>
                    {request.message && (
                      <Text
                        style={[styles.message, { color: colors.mutedForeground }]}
                        numberOfLines={2}
                      >
                        "{request.message}"
                      </Text>
                    )}
                  </View>
                </View>

                {/* Actions or Status */}
                {isPending ? (
                  <View style={styles.actions}>
                    {isProcessing ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            styles.declineButton,
                            { borderColor: colors.destructive },
                          ]}
                          onPress={() => handleDecline(request.id)}
                        >
                          <FontAwesome
                            name="times"
                            size={14}
                            color={colors.destructive}
                          />
                          <Text
                            style={[
                              styles.actionButtonText,
                              { color: colors.destructive },
                            ]}
                          >
                            Decline
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            styles.acceptButton,
                            { backgroundColor: colors.primary },
                          ]}
                          onPress={() => handleAccept(request.id)}
                        >
                          <FontAwesome
                            name="check"
                            size={14}
                            color={colors.primaryForeground}
                          />
                          <Text
                            style={[
                              styles.actionButtonText,
                              { color: colors.primaryForeground },
                            ]}
                          >
                            Accept
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ) : (
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          SESSION_STATUS_CONFIG[request.status].bgColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: SESSION_STATUS_CONFIG[request.status].color,
                        },
                      ]}
                    >
                      {SESSION_STATUS_CONFIG[request.status].label}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  requestCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  requestInfo: {
    flexDirection: "row",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  requestDetails: {
    flex: 1,
  },
  requesterName: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 4,
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  dateTimeText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    marginRight: 8,
  },
  message: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    fontStyle: "italic",
    marginTop: 4,
    lineHeight: 16,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.15)",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  declineButton: {
    borderWidth: 1,
  },
  acceptButton: {},
  actionButtonText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  statusBadge: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillaxSemibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
