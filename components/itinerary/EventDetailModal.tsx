import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useColors } from "@/lib/context/theme";
import { typography } from "@/constants/theme";
import type { ItineraryEventWithDetails, ItineraryEventCategory } from "@/types/database";

interface EventDetailModalProps {
  visible: boolean;
  event: ItineraryEventWithDetails | null;
  isAdmin: boolean;
  isSignedUp: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSignUp: () => void;
  onWithdraw: () => void;
}

// Category config
const CATEGORY_CONFIG: Record<
  ItineraryEventCategory,
  { label: string; color: string; icon: string }
> = {
  meal: { label: "Meal", color: "#f97316", icon: "cutlery" },
  workshop: { label: "Workshop", color: "#8b5cf6", icon: "pencil" },
  activity: { label: "Activity", color: "#22c55e", icon: "bolt" },
  free_time: { label: "Free Time", color: "#64748b", icon: "coffee" },
  travel: { label: "Travel", color: "#3b82f6", icon: "car" },
  other: { label: "Other", color: "#6b7280", icon: "star" },
};

// Format time for display
function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Format date for display
function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function EventDetailModal({
  visible,
  event,
  isAdmin,
  isSignedUp,
  onClose,
  onEdit,
  onDelete,
  onSignUp,
  onWithdraw,
}: EventDetailModalProps) {
  const colors = useColors();

  if (!event) return null;

  const category = event.category || "other";
  const categoryConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
  const signups = event.itinerary_event_signups || [];
  const signupCount = signups.length;
  const isFull = event.capacity !== null && signupCount >= event.capacity;

  const handleLinkPress = async (url: string) => {
    // Add protocol if missing
    let finalUrl = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      finalUrl = `https://${url}`;
    }

    try {
      const canOpen = await Linking.canOpenURL(finalUrl);
      if (canOpen) {
        await Linking.openURL(finalUrl);
      } else {
        console.error("Cannot open URL:", finalUrl);
      }
    } catch (err) {
      console.error("Error opening link:", err);
    }
  };

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

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Category Badge */}
          <View style={styles.categoryRow}>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: categoryConfig.color + "20" },
              ]}
            >
              <FontAwesome
                name={categoryConfig.icon as any}
                size={14}
                color={categoryConfig.color}
              />
              <Text style={[styles.categoryText, { color: categoryConfig.color }]}>
                {categoryConfig.label}
              </Text>
            </View>
            {event.is_optional && (
              <View
                style={[styles.optionalBadge, { backgroundColor: colors.muted }]}
              >
                <Text
                  style={[styles.optionalText, { color: colors.mutedForeground }]}
                >
                  Optional
                </Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={[styles.eventTitle, { color: colors.foreground }]}>
            {event.title}
          </Text>

          {/* Date & Time */}
          <View style={styles.section}>
            <View style={styles.infoRow}>
              <FontAwesome
                name="calendar"
                size={16}
                color={colors.mutedForeground}
              />
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                {formatDate(event.event_date)}
              </Text>
            </View>
            {event.start_time && (
              <View style={styles.infoRow}>
                <FontAwesome
                  name="clock-o"
                  size={16}
                  color={colors.mutedForeground}
                />
                <Text style={[styles.infoText, { color: colors.foreground }]}>
                  {formatTime(event.start_time)}
                  {event.end_time && ` - ${formatTime(event.end_time)}`}
                </Text>
              </View>
            )}
          </View>

          {/* Location */}
          {event.location && (
            <View style={styles.section}>
              <View style={styles.infoRow}>
                <FontAwesome
                  name="map-marker"
                  size={16}
                  color={colors.mutedForeground}
                />
                <Text style={[styles.infoText, { color: colors.foreground }]}>
                  {event.location}
                </Text>
              </View>
            </View>
          )}

          {/* Description */}
          {event.description && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Description
              </Text>
              <Text
                style={[styles.description, { color: colors.mutedForeground }]}
              >
                {event.description}
              </Text>
            </View>
          )}

          {/* Links */}
          {event.links && event.links.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Links
              </Text>
              {event.links.map((link, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.linkButton, { borderColor: colors.border }]}
                  onPress={() => handleLinkPress(link.url)}
                >
                  <FontAwesome
                    name="external-link"
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={[styles.linkText, { color: colors.primary }]}>
                    {link.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Checklist */}
          {event.checklist && event.checklist.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                What to Bring
              </Text>
              {event.checklist.map((item, index) => (
                <View key={index} style={styles.checklistItem}>
                  <FontAwesome
                    name="check-square-o"
                    size={16}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.checklistText,
                      { color: colors.foreground },
                    ]}
                  >
                    {item.text}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Attendees */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Attendees
              {event.capacity && (
                <Text style={[styles.capacityText, { color: colors.mutedForeground }]}>
                  {" "}({signupCount}/{event.capacity})
                </Text>
              )}
            </Text>
            {signups.length > 0 ? (
              <View style={styles.attendeeList}>
                {signups.map((signup) => (
                  <View key={signup.id} style={styles.attendeeItem}>
                    <View
                      style={[
                        styles.attendeeAvatar,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.attendeeInitial}>
                        {signup.profiles?.display_name?.[0]?.toUpperCase() ||
                          signup.profiles?.email?.[0]?.toUpperCase() ||
                          "?"}
                      </Text>
                    </View>
                    <Text
                      style={[styles.attendeeName, { color: colors.foreground }]}
                    >
                      {signup.profiles?.display_name || signup.profiles?.email}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text
                style={[styles.noAttendeesText, { color: colors.mutedForeground }]}
              >
                No one has signed up yet
              </Text>
            )}
          </View>

          {/* Sign Up / Withdraw Button */}
          {event.is_optional && (
            <View style={styles.signupSection}>
              {isSignedUp ? (
                <TouchableOpacity
                  style={[
                    styles.withdrawButton,
                    { borderColor: colors.destructive },
                  ]}
                  onPress={onWithdraw}
                >
                  <FontAwesome
                    name="times"
                    size={16}
                    color={colors.destructive}
                  />
                  <Text
                    style={[
                      styles.withdrawButtonText,
                      { color: colors.destructive },
                    ]}
                  >
                    Withdraw
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.signupButton,
                    {
                      backgroundColor: isFull ? colors.muted : colors.primary,
                    },
                  ]}
                  onPress={onSignUp}
                  disabled={isFull}
                >
                  <FontAwesome
                    name="check"
                    size={16}
                    color={isFull ? colors.mutedForeground : colors.primaryForeground}
                  />
                  <Text
                    style={[
                      styles.signupButtonText,
                      {
                        color: isFull
                          ? colors.mutedForeground
                          : colors.primaryForeground,
                      },
                    ]}
                  >
                    {isFull ? "Event Full" : "Sign Up"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>

        {/* Footer for admins */}
        {isAdmin && (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.editButton, { borderColor: colors.border }]}
              onPress={onEdit}
            >
              <FontAwesome name="edit" size={16} color={colors.foreground} />
              <Text style={[styles.editButtonText, { color: colors.foreground }]}>
                Edit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: colors.destructive }]}
              onPress={onDelete}
            >
              <FontAwesome name="trash" size={16} color="#fff" />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
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
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  optionalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  optionalText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  eventTitle: {
    fontSize: 24,
    fontFamily: typography.fontFamily.chillaxBold,
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 8,
  },
  capacityText: {
    fontFamily: typography.fontFamily.chillax,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
  },
  description: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    lineHeight: 22,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginBottom: 8,
  },
  linkText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  checklistText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  attendeeList: {
    gap: 8,
  },
  attendeeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  attendeeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  attendeeInitial: {
    color: "#fff",
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  attendeeName: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  noAttendeesText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    fontStyle: "italic",
  },
  signupSection: {
    marginTop: 8,
  },
  signupButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  signupButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  withdrawButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  withdrawButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  deleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
});
