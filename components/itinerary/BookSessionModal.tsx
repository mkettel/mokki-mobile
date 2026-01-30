import React, { useState, useEffect } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { FontAwesome } from "@expo/vector-icons";
import { useColors } from "@/lib/context/theme";
import { typography } from "@/constants/theme";
import {
  TIME_SLOTS,
  formatTimeSlot,
  DEFAULT_SESSION_BOOKING_CONFIG,
} from "@/constants/sessionBooking";
import {
  getHouseAdmins,
  createSessionRequest,
  getAcceptedSessions,
  getMySessionRequests,
  cancelRequest,
} from "@/lib/api/sessionBooking";
import { getHouseItinerary } from "@/lib/api/itinerary";
import { sendSessionRequestNotification } from "@/lib/api/notifications";
import { formatLocalDate, parseLocalDate } from "@/lib/utils/dates";
import type {
  Profile,
  HouseMember,
  SessionBookingConfig,
  SessionRequestWithProfiles,
  ItineraryEventWithDetails,
} from "@/types/database";

// Parse time string (HH:MM) to minutes from midnight
function parseTimeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

// Check if two time ranges overlap
function timeRangesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && end1 > start2;
}

// Check if a time slot conflicts with existing sessions or events
function isTimeSlotUnavailable(
  timeSlot: string,
  sessionDuration: number,
  existingSessions: SessionRequestWithProfiles[],
  existingEvents: ItineraryEventWithDetails[],
  selectedAdminId: string | null
): { unavailable: boolean; reason?: string } {
  const slotStart = parseTimeToMinutes(timeSlot);
  const slotEnd = slotStart + sessionDuration;

  // Check against existing accepted sessions for this admin
  for (const session of existingSessions) {
    if (session.admin_id !== selectedAdminId) continue;

    const sessionStart = parseTimeToMinutes(session.requested_time);
    const sessionEnd = sessionStart + session.duration_minutes;

    if (timeRangesOverlap(slotStart, slotEnd, sessionStart, sessionEnd)) {
      return { unavailable: true, reason: "Session booked" };
    }
  }

  // Check against existing events (for the admin)
  for (const event of existingEvents) {
    if (!event.start_time) continue;

    const eventStart = parseTimeToMinutes(event.start_time);
    const eventEnd = event.end_time
      ? parseTimeToMinutes(event.end_time)
      : eventStart + 60; // Default 1 hour if no end time

    if (timeRangesOverlap(slotStart, slotEnd, eventStart, eventEnd)) {
      return { unavailable: true, reason: "Event scheduled" };
    }
  }

  return { unavailable: false };
}

interface BookSessionModalProps {
  visible: boolean;
  houseId: string;
  houseName?: string;
  currentUserId: string;
  currentUserName?: string;
  tripStartDate: string;
  tripEndDate?: string;
  config?: SessionBookingConfig;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookSessionModal({
  visible,
  houseId,
  houseName,
  currentUserId,
  currentUserName,
  tripStartDate,
  tripEndDate,
  config,
  onClose,
  onSuccess,
}: BookSessionModalProps) {
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [admins, setAdmins] = useState<(HouseMember & { profiles: Profile })[]>([]);

  // Pending requests state
  const [pendingRequests, setPendingRequests] = useState<SessionRequestWithProfiles[]>([]);
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);

  // Form state
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(() => parseLocalDate(tripStartDate));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Availability state
  const [existingSessions, setExistingSessions] = useState<SessionRequestWithProfiles[]>([]);
  const [existingEvents, setExistingEvents] = useState<ItineraryEventWithDetails[]>([]);

  const label = config?.label || DEFAULT_SESSION_BOOKING_CONFIG.label || "Book a Session";
  const duration = config?.defaultDuration || DEFAULT_SESSION_BOOKING_CONFIG.defaultDuration || 45;
  const description = config?.description;

  // Load admins and pending requests when modal opens
  useEffect(() => {
    if (visible && houseId) {
      loadAdmins();
      loadPendingRequests();
    }
  }, [visible, houseId]);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedAdmin(null);
      setSelectedDate(parseLocalDate(tripStartDate));
      setSelectedTime(null);
      setMessage("");
      setExistingSessions([]);
      setExistingEvents([]);
    }
  }, [visible, tripStartDate]);

  // Fetch availability when admin or date changes
  useEffect(() => {
    if (!visible || !houseId) return;

    const fetchAvailability = async () => {
      setIsLoadingAvailability(true);
      const dateStr = formatLocalDate(selectedDate);

      // Fetch accepted sessions for this date
      const { sessions } = await getAcceptedSessions(houseId, dateStr);
      setExistingSessions(sessions);

      // Fetch events for this date
      const { events } = await getHouseItinerary(houseId);
      const eventsForDate = events.filter((e) => e.event_date === dateStr);
      setExistingEvents(eventsForDate);

      // Clear selected time if it's now unavailable
      if (selectedTime && selectedAdmin) {
        const { unavailable } = isTimeSlotUnavailable(
          selectedTime,
          duration,
          sessions,
          eventsForDate,
          selectedAdmin
        );
        if (unavailable) {
          setSelectedTime(null);
        }
      }

      setIsLoadingAvailability(false);
    };

    fetchAvailability();
  }, [visible, houseId, selectedDate, selectedAdmin]);

  const loadAdmins = async () => {
    setIsLoading(true);
    const { admins: fetchedAdmins, error } = await getHouseAdmins(houseId);
    if (!error) {
      // Filter out current user if they're an admin
      const filteredAdmins = fetchedAdmins.filter(
        (admin) => admin.user_id !== currentUserId
      );
      setAdmins(filteredAdmins);
    }
    setIsLoading(false);
  };

  const loadPendingRequests = async () => {
    const { requests, error } = await getMySessionRequests(houseId, currentUserId);
    if (!error) {
      // Filter to only show pending requests
      const pending = requests.filter((r) => r.status === "pending");
      setPendingRequests(pending);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    Alert.alert(
      "Cancel Request",
      "Are you sure you want to cancel this session request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setCancellingRequestId(requestId);
            const { error } = await cancelRequest(requestId);
            setCancellingRequestId(null);

            if (error) {
              Alert.alert("Error", "Failed to cancel request. Please try again.");
            } else {
              // Refresh pending requests
              loadPendingRequests();
              onSuccess(); // Refresh parent data too
            }
          },
        },
      ]
    );
  };

  const formatRequestDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const handleSubmit = async () => {
    if (!selectedAdmin) {
      Alert.alert("Error", "Please select who you'd like to book with");
      return;
    }
    if (!selectedTime) {
      Alert.alert("Error", "Please select a time slot");
      return;
    }

    setIsSubmitting(true);
    try {
      const requestedDateStr = formatLocalDate(selectedDate);
      const { request, error } = await createSessionRequest({
        houseId,
        requesterId: currentUserId,
        adminId: selectedAdmin,
        requestedDate: requestedDateStr,
        requestedTime: selectedTime,
        durationMinutes: duration,
        message: message.trim() || undefined,
      });

      if (error) {
        Alert.alert("Error", "Failed to submit request. Please try again.");
      } else {
        // Send notification to admin
        if (houseName && currentUserName) {
          sendSessionRequestNotification({
            houseId,
            adminId: selectedAdmin,
            requesterName: currentUserName,
            requestedDate: requestedDateStr,
            requestedTime: formatTimeSlot(selectedTime),
            houseName,
          }).catch((err) => {
            // Don't fail the request if notification fails
            console.error("Failed to send session request notification:", err);
          });
        }
        onSuccess();
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const minDate = parseLocalDate(tripStartDate);
  const maxDate = tripEndDate ? parseLocalDate(tripEndDate) : undefined;

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="times" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {label}
          </Text>
          <View style={styles.closeButton} />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Description */}
              {description && (
                <Text style={[styles.description, { color: colors.mutedForeground }]}>
                  {description}
                </Text>
              )}

              {/* Pending Requests Section */}
              {pendingRequests.length > 0 && (
                <View style={[styles.pendingSection, { borderColor: colors.border }]}>
                  <View style={styles.pendingSectionHeader}>
                    <FontAwesome name="clock-o" size={14} color={colors.primary} />
                    <Text style={[styles.pendingSectionTitle, { color: colors.foreground }]}>
                      Your Pending Requests
                    </Text>
                    <View style={[styles.pendingBadge, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.pendingBadgeText, { color: colors.primaryForeground }]}>
                        {pendingRequests.length}
                      </Text>
                    </View>
                  </View>

                  {pendingRequests.map((request) => {
                    const adminName =
                      request.admin.display_name || request.admin.email.split("@")[0];
                    const isCancelling = cancellingRequestId === request.id;

                    return (
                      <View
                        key={request.id}
                        style={[
                          styles.pendingRequestCard,
                          { backgroundColor: colors.card, borderColor: colors.border },
                        ]}
                      >
                        <View style={styles.pendingRequestInfo}>
                          <Text style={[styles.pendingRequestAdmin, { color: colors.foreground }]}>
                            Session with {adminName}
                          </Text>
                          <View style={styles.pendingRequestDetails}>
                            <FontAwesome name="calendar" size={11} color={colors.mutedForeground} />
                            <Text style={[styles.pendingRequestDetailText, { color: colors.mutedForeground }]}>
                              {formatRequestDate(request.requested_date)}
                            </Text>
                            <FontAwesome name="clock-o" size={11} color={colors.mutedForeground} />
                            <Text style={[styles.pendingRequestDetailText, { color: colors.mutedForeground }]}>
                              {formatTimeSlot(request.requested_time)}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={[styles.cancelRequestButton, { borderColor: colors.destructive }]}
                          onPress={() => handleCancelRequest(request.id)}
                          disabled={isCancelling}
                        >
                          {isCancelling ? (
                            <ActivityIndicator size="small" color={colors.destructive} />
                          ) : (
                            <FontAwesome name="times" size={12} color={colors.destructive} />
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Select Admin */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  Select Host
                </Text>
                {admins.length === 0 ? (
                  <Text style={[styles.noAdminsText, { color: colors.mutedForeground }]}>
                    No hosts available
                  </Text>
                ) : (
                  <View style={styles.adminGrid}>
                    {admins.map((admin) => {
                      const profile = admin.profiles;
                      const isSelected = selectedAdmin === admin.user_id;
                      const displayName =
                        profile.display_name || profile.email.split("@")[0];
                      const initial = displayName.charAt(0).toUpperCase();

                      return (
                        <TouchableOpacity
                          key={admin.user_id}
                          style={[
                            styles.adminCard,
                            {
                              backgroundColor: isSelected
                                ? colors.primary + "20"
                                : colors.card,
                              borderColor: isSelected
                                ? colors.primary
                                : colors.border,
                            },
                          ]}
                          onPress={() => setSelectedAdmin(admin.user_id)}
                        >
                          {profile.avatar_url ? (
                            <Image
                              source={{ uri: profile.avatar_url }}
                              style={styles.adminAvatar}
                            />
                          ) : (
                            <View
                              style={[
                                styles.adminAvatar,
                                { backgroundColor: colors.muted },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.adminAvatarText,
                                  { color: colors.foreground },
                                ]}
                              >
                                {initial}
                              </Text>
                            </View>
                          )}
                          <Text
                            style={[
                              styles.adminName,
                              {
                                color: isSelected
                                  ? colors.primary
                                  : colors.foreground,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {displayName}
                          </Text>
                          {isSelected && (
                            <FontAwesome
                              name="check-circle"
                              size={16}
                              color={colors.primary}
                              style={styles.adminCheckIcon}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Select Date */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  Select Date
                </Text>
                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    { backgroundColor: colors.muted, borderColor: colors.border },
                  ]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <FontAwesome name="calendar" size={16} color={colors.foreground} />
                  <Text style={[styles.dateText, { color: colors.foreground }]}>
                    {formatDateDisplay(selectedDate)}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(event, date) => {
                        if (Platform.OS === "android") {
                          setShowDatePicker(false);
                        }
                        if (date) setSelectedDate(date);
                      }}
                      minimumDate={minDate}
                      maximumDate={maxDate}
                      style={Platform.OS === "ios" ? styles.iosPicker : undefined}
                    />
                    {Platform.OS === "ios" && (
                      <TouchableOpacity
                        style={styles.doneButton}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={[styles.doneButtonText, { color: colors.primary }]}>
                          Done
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>

              {/* Select Time */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  Select Time
                </Text>
                {isLoadingAvailability ? (
                  <View style={styles.timeLoadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.timeLoadingText, { color: colors.mutedForeground }]}>
                      Checking availability...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.timeGrid}>
                    {TIME_SLOTS.map((time) => {
                      const isSelected = selectedTime === time;
                      const { unavailable, reason } = isTimeSlotUnavailable(
                        time,
                        duration,
                        existingSessions,
                        existingEvents,
                        selectedAdmin
                      );

                      return (
                        <TouchableOpacity
                          key={time}
                          style={[
                            styles.timeSlot,
                            {
                              backgroundColor: isSelected
                                ? colors.primary
                                : unavailable
                                ? colors.muted + "60"
                                : colors.muted,
                              borderColor: isSelected
                                ? colors.primary
                                : unavailable
                                ? colors.border + "60"
                                : colors.border,
                            },
                            unavailable && styles.timeSlotUnavailable,
                          ]}
                          onPress={() => !unavailable && setSelectedTime(time)}
                          disabled={unavailable}
                        >
                          <Text
                            style={[
                              styles.timeSlotText,
                              {
                                color: isSelected
                                  ? colors.primaryForeground
                                  : unavailable
                                  ? colors.mutedForeground + "80"
                                  : colors.foreground,
                              },
                              unavailable && styles.timeSlotTextUnavailable,
                            ]}
                          >
                            {formatTimeSlot(time)}
                          </Text>
                          {unavailable && (
                            <Text style={[styles.unavailableReason, { color: colors.mutedForeground }]}>
                              {reason}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Duration Info */}
              <View style={[styles.durationInfo, { borderColor: colors.border }]}>
                <FontAwesome name="clock-o" size={14} color={colors.mutedForeground} />
                <Text style={[styles.durationText, { color: colors.mutedForeground }]}>
                  Sessions are {duration} minutes
                </Text>
              </View>

              {/* Message */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  Add a Note (Optional)
                </Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: colors.muted,
                      borderColor: colors.border,
                      color: colors.foreground,
                    },
                  ]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Let them know what you'd like to discuss..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={500}
                />
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: colors.primary },
                  (!selectedAdmin || !selectedTime || isSubmitting) &&
                    styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!selectedAdmin || !selectedTime || isSubmitting}
              >
                <Text
                  style={[styles.submitButtonText, { color: colors.primaryForeground }]}
                >
                  {isSubmitting ? "Sending Request..." : "Send Request"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  description: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    marginBottom: 20,
    lineHeight: 20,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 12,
  },
  noAdminsText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    fontStyle: "italic",
  },
  adminGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  adminCard: {
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 100,
  },
  adminAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  adminAvatarText: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  adminName: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
    textAlign: "center",
  },
  adminCheckIcon: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  dateText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
  },
  iosPicker: {
    height: 150,
    marginTop: 8,
  },
  doneButton: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  doneButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeSlot: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 85,
    alignItems: "center",
  },
  timeSlotText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  timeSlotUnavailable: {
    opacity: 0.6,
  },
  timeSlotTextUnavailable: {
    textDecorationLine: "line-through",
  },
  unavailableReason: {
    fontSize: 9,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  timeLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  timeLoadingText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  durationInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    marginBottom: 24,
  },
  durationText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  textArea: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
    minHeight: 80,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  submitButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  // Pending requests styles
  pendingSection: {
    marginBottom: 24,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  pendingSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  pendingSectionTitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
    flex: 1,
  },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: "center",
  },
  pendingBadgeText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  pendingRequestCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  pendingRequestInfo: {
    flex: 1,
  },
  pendingRequestAdmin: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 4,
  },
  pendingRequestDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pendingRequestDetailText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginRight: 8,
  },
  cancelRequestButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
