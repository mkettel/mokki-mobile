import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useColors } from "@/lib/context/theme";
import { typography } from "@/constants/theme";
import type { EventWithDetails } from "@/lib/api/events";

interface EventDetailModalProps {
  visible: boolean;
  event: EventWithDetails | null;
  currentUserId: string;
  onClose: () => void;
  onEdit: (event: EventWithDetails) => void;
  onDelete: (event: EventWithDetails) => void;
}

// Parse a date string as local time (not UTC)
// YYYY-MM-DD strings are interpreted as UTC by default, which causes timezone issues
function parseLocalDate(dateString: string): Date {
  // If it's a date-only string (YYYY-MM-DD), parse as local time
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  // Otherwise, let Date parse it normally (for full timestamps)
  return new Date(dateString);
}

function formatEventDate(event: EventWithDetails): string {
  const startDate = parseLocalDate(event.event_date);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  };

  let dateStr = startDate.toLocaleDateString("en-US", options);

  if (event.end_date && event.end_date !== event.event_date) {
    const endDate = parseLocalDate(event.end_date);
    dateStr += ` - ${endDate.toLocaleDateString("en-US", options)}`;
  }

  return dateStr;
}

function formatTime(time: string | null): string {
  if (!time) return "";

  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minutes} ${ampm}`;
}

function formatTimeRange(event: EventWithDetails): string | null {
  if (!event.event_time) return null;

  const startTime = formatTime(event.event_time);
  if (event.end_time) {
    const endTime = formatTime(event.end_time);
    return `${startTime} - ${endTime}`;
  }
  return startTime;
}

function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function getEventStatus(event: EventWithDetails): "today" | "upcoming" | "past" {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventDate = parseLocalDate(event.event_date);
  eventDate.setHours(0, 0, 0, 0);

  const endDate = event.end_date ? parseLocalDate(event.end_date) : eventDate;
  endDate.setHours(0, 0, 0, 0);

  if (eventDate.getTime() === today.getTime()) {
    return "today";
  }
  if (eventDate > today || (eventDate <= today && endDate >= today)) {
    return "upcoming";
  }
  return "past";
}

export function EventDetailModal({
  visible,
  event,
  currentUserId,
  onClose,
  onEdit,
  onDelete,
}: EventDetailModalProps) {
  const colors = useColors();

  if (!event) return null;

  const isCreator = currentUserId === event.created_by;
  const status = getEventStatus(event);
  const isPast = status === "past";
  const canEdit = isCreator && !isPast;
  const canDelete = isCreator && !isPast;
  const timeRange = formatTimeRange(event);

  const getCreatorName = () => {
    const profile = event.profiles;
    return profile.display_name || profile.email.split("@")[0];
  };

  const getParticipantName = (profile: { display_name: string | null; email: string }) => {
    return profile.display_name || profile.email.split("@")[0];
  };

  const getParticipantInitial = (profile: { display_name: string | null; email: string }) => {
    const name = profile.display_name || profile.email;
    return name.charAt(0).toUpperCase();
  };

  const getStatusBadge = () => {
    const configs = {
      today: { bg: "#fbbf24", text: "#78350f", label: "Today" },
      upcoming: { bg: colors.muted, text: colors.foreground, label: "Upcoming" },
      past: { bg: colors.muted, text: colors.mutedForeground, label: "Past" },
    };
    return configs[status];
  };

  const statusConfig = getStatusBadge();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="times" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Event Details
          </Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Event Name and Status */}
          <View style={styles.nameSection}>
            <View style={[styles.iconContainer, { backgroundColor: "#fef3c7" }]}>
              <FontAwesome name="calendar" size={24} color="#d97706" />
            </View>
            <View style={styles.nameInfo}>
              <Text style={[styles.eventName, { color: colors.foreground }]}>
                {event.name}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <Text style={[styles.statusText, { color: statusConfig.text }]}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Created By */}
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <FontAwesome name="user" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
              Created by
            </Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {getCreatorName()}
            </Text>
          </View>

          {/* Date */}
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <FontAwesome name="calendar-o" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
              Date
            </Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {formatEventDate(event)}
            </Text>
          </View>

          {/* Time */}
          {timeRange && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <FontAwesome name="clock-o" size={16} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
                Time
              </Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {timeRange}
              </Text>
            </View>
          )}

          {/* Description */}
          {event.description && (
            <View style={styles.descriptionSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Description
              </Text>
              <Text style={[styles.descriptionText, { color: colors.mutedForeground }]}>
                {event.description}
              </Text>
            </View>
          )}

          {/* Links */}
          {event.links && event.links.length > 0 && (
            <View style={styles.linksSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Links
              </Text>
              <View style={styles.linksContainer}>
                {event.links.map((link, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.linkButton, { backgroundColor: colors.muted }]}
                    onPress={() => Linking.openURL(link)}
                  >
                    <FontAwesome name="external-link" size={12} color={colors.primary} />
                    <Text style={[styles.linkText, { color: colors.primary }]}>
                      {getDomainFromUrl(link)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Participants */}
          {event.event_participants && event.event_participants.length > 0 && (
            <View style={styles.participantsSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Tagged Members ({event.event_participants.length})
              </Text>
              <View style={styles.participantsList}>
                {event.event_participants.map((participant) => (
                  <View
                    key={participant.id}
                    style={[styles.participantItem, { backgroundColor: colors.muted }]}
                  >
                    <View style={[styles.participantAvatar, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.participantInitial, { color: colors.primaryForeground }]}>
                        {getParticipantInitial(participant.profiles)}
                      </Text>
                    </View>
                    <Text style={[styles.participantName, { color: colors.foreground }]}>
                      {getParticipantName(participant.profiles)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        {(canEdit || canDelete) && (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            {canEdit && (
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  onClose();
                  onEdit(event);
                }}
              >
                <FontAwesome name="pencil" size={16} color={colors.primaryForeground} />
                <Text style={[styles.editButtonText, { color: colors.primaryForeground }]}>
                  Edit Event
                </Text>
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity
                style={[styles.deleteButton, { borderColor: colors.destructive }]}
                onPress={() => {
                  onClose();
                  onDelete(event);
                }}
              >
                <FontAwesome name="trash-o" size={16} color={colors.destructive} />
                <Text style={[styles.deleteButtonText, { color: colors.destructive }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            )}
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  nameSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  nameInfo: {
    flex: 1,
    marginLeft: 16,
  },
  eventName: {
    fontSize: 22,
    fontFamily: typography.fontFamily.chillaxSemibold,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    width: 80,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
    textAlign: "right",
  },
  descriptionSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxSemibold,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
    lineHeight: 22,
  },
  linksSection: {
    marginTop: 24,
  },
  linksContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  linkText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  participantsSection: {
    marginTop: 24,
  },
  participantsList: {
    gap: 8,
  },
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    gap: 12,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  participantInitial: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  participantName: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  footer: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 20,
  },
  deleteButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
});
