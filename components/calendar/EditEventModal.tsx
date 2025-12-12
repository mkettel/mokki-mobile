import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { FontAwesome } from "@expo/vector-icons";
import { useColors } from "@/lib/context/theme";
import { typography } from "@/constants/theme";
import type { Profile } from "@/types/database";
import type { EventWithDetails } from "@/lib/api/events";

interface EditEventModalProps {
  visible: boolean;
  event: EventWithDetails | null;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description?: string;
    eventDate: string;
    eventTime?: string;
    endDate?: string;
    endTime?: string;
    links?: string[];
    participantIds?: string[];
  }) => Promise<void>;
  members: Profile[];
}

function parseTimeString(timeStr: string | null): Date | null {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function EditEventModal({
  visible,
  event,
  onClose,
  onSubmit,
  members,
}: EditEventModalProps) {
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState(new Date());
  const [eventTime, setEventTime] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [links, setLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  // Picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Initialize form when event changes
  useEffect(() => {
    if (event && visible) {
      setName(event.name);
      setDescription(event.description || "");
      setEventDate(new Date(event.event_date + "T00:00:00"));
      setEventTime(parseTimeString(event.event_time));
      setEndDate(event.end_date ? new Date(event.end_date + "T00:00:00") : null);
      setEndTime(parseTimeString(event.end_time));
      setLinks(event.links || []);
      setNewLink("");
      setSelectedParticipants(
        event.event_participants?.map((p) => p.user_id) || []
      );
    }
  }, [event, visible]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter an event name");
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        eventDate: eventDate.toISOString().split("T")[0],
        eventTime: eventTime
          ? `${eventTime.getHours().toString().padStart(2, "0")}:${eventTime.getMinutes().toString().padStart(2, "0")}`
          : undefined,
        endDate: endDate ? endDate.toISOString().split("T")[0] : undefined,
        endTime: endTime
          ? `${endTime.getHours().toString().padStart(2, "0")}:${endTime.getMinutes().toString().padStart(2, "0")}`
          : undefined,
        links: links.length > 0 ? links : undefined,
        participantIds: selectedParticipants.length > 0 ? selectedParticipants : undefined,
      });
      handleClose();
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const addLink = () => {
    const trimmedLink = newLink.trim();
    if (trimmedLink) {
      const linkWithProtocol = trimmedLink.startsWith("http")
        ? trimmedLink
        : `https://${trimmedLink}`;
      setLinks([...links, linkWithProtocol]);
      setNewLink("");
    }
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const toggleParticipant = (userId: string) => {
    if (selectedParticipants.includes(userId)) {
      setSelectedParticipants(selectedParticipants.filter((id) => id !== userId));
    } else {
      setSelectedParticipants([...selectedParticipants, userId]);
    }
  };

  const getDisplayName = (profile: Profile) => {
    return profile.display_name || profile.email.split("@")[0];
  };

  if (!event) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <FontAwesome name="times" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Edit Event
          </Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Event Name */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Event Name *
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Dinner reservation, Ski lesson"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          {/* Event Date */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Date *
            </Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <FontAwesome name="calendar" size={16} color={colors.mutedForeground} />
              <Text style={[styles.dateText, { color: colors.foreground }]}>
                {formatDate(eventDate)}
              </Text>
            </TouchableOpacity>
            {(showDatePicker || Platform.OS === "ios") && (
              <DateTimePicker
                value={eventDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(e, date) => {
                  setShowDatePicker(false);
                  if (date) setEventDate(date);
                }}
                style={Platform.OS === "ios" ? styles.iosPicker : undefined}
              />
            )}
          </View>

          {/* Event Time (Optional) */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Start Time (optional)
            </Text>
            <View style={styles.timeRow}>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  { backgroundColor: colors.muted, borderColor: colors.border, flex: 1 },
                ]}
                onPress={() => setShowTimePicker(true)}
              >
                <FontAwesome name="clock-o" size={16} color={colors.mutedForeground} />
                <Text style={[styles.dateText, { color: eventTime ? colors.foreground : colors.mutedForeground }]}>
                  {eventTime ? formatTime(eventTime) : "No time set"}
                </Text>
              </TouchableOpacity>
              {eventTime && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setEventTime(null)}
                >
                  <FontAwesome name="times-circle" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
            {showTimePicker && (
              <DateTimePicker
                value={eventTime || new Date()}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(e, date) => {
                  setShowTimePicker(false);
                  if (date) setEventTime(date);
                }}
                style={Platform.OS === "ios" ? styles.iosPicker : undefined}
              />
            )}
          </View>

          {/* End Date (Optional) */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              End Date (optional, for multi-day events)
            </Text>
            <View style={styles.timeRow}>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  { backgroundColor: colors.muted, borderColor: colors.border, flex: 1 },
                ]}
                onPress={() => setShowEndDatePicker(true)}
              >
                <FontAwesome name="calendar" size={16} color={colors.mutedForeground} />
                <Text style={[styles.dateText, { color: endDate ? colors.foreground : colors.mutedForeground }]}>
                  {endDate ? formatDate(endDate) : "Same as start date"}
                </Text>
              </TouchableOpacity>
              {endDate && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setEndDate(null)}
                >
                  <FontAwesome name="times-circle" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
            {showEndDatePicker && (
              <DateTimePicker
                value={endDate || eventDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(e, date) => {
                  setShowEndDatePicker(false);
                  if (date) setEndDate(date);
                }}
                minimumDate={eventDate}
                style={Platform.OS === "ios" ? styles.iosPicker : undefined}
              />
            )}
          </View>

          {/* End Time (Optional) */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              End Time (optional)
            </Text>
            <View style={styles.timeRow}>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  { backgroundColor: colors.muted, borderColor: colors.border, flex: 1 },
                ]}
                onPress={() => setShowEndTimePicker(true)}
              >
                <FontAwesome name="clock-o" size={16} color={colors.mutedForeground} />
                <Text style={[styles.dateText, { color: endTime ? colors.foreground : colors.mutedForeground }]}>
                  {endTime ? formatTime(endTime) : "No end time"}
                </Text>
              </TouchableOpacity>
              {endTime && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setEndTime(null)}
                >
                  <FontAwesome name="times-circle" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
            {showEndTimePicker && (
              <DateTimePicker
                value={endTime || new Date()}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(e, date) => {
                  setShowEndTimePicker(false);
                  if (date) setEndTime(date);
                }}
                style={Platform.OS === "ios" ? styles.iosPicker : undefined}
              />
            )}
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Description (optional)
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
              value={description}
              onChangeText={setDescription}
              placeholder="Event details..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Links */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Links (optional)
            </Text>
            <View style={styles.linkInputRow}>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.muted,
                    borderColor: colors.border,
                    color: colors.foreground,
                    flex: 1,
                  },
                ]}
                value={newLink}
                onChangeText={setNewLink}
                placeholder="https://..."
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="url"
              />
              <TouchableOpacity
                style={[styles.addLinkButton, { backgroundColor: colors.primary }]}
                onPress={addLink}
              >
                <FontAwesome name="plus" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            {links.length > 0 && (
              <View style={styles.linksContainer}>
                {links.map((link, index) => (
                  <View
                    key={index}
                    style={[styles.linkChip, { backgroundColor: colors.muted }]}
                  >
                    <Text
                      style={[styles.linkChipText, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {link}
                    </Text>
                    <TouchableOpacity onPress={() => removeLink(index)}>
                      <FontAwesome name="times" size={14} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Participants */}
          {members.length > 0 && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Tag Members (optional)
              </Text>
              <View style={styles.participantsGrid}>
                {members.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.participantChip,
                      {
                        backgroundColor: selectedParticipants.includes(member.id)
                          ? colors.primary
                          : colors.muted,
                        borderColor: selectedParticipants.includes(member.id)
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                    onPress={() => toggleParticipant(member.id)}
                  >
                    <Text
                      style={[
                        styles.participantChipText,
                        {
                          color: selectedParticipants.includes(member.id)
                            ? "#fff"
                            : colors.foreground,
                        },
                      ]}
                    >
                      {getDisplayName(member)}
                    </Text>
                    {selectedParticipants.includes(member.id) && (
                      <FontAwesome name="check" size={12} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Submit Button */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              isLoading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={[styles.submitButtonText, { color: colors.primaryForeground }]}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Text>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 8,
  },
  textInput: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
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
    height: 120,
    marginTop: -8,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clearButton: {
    padding: 8,
  },
  linkInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  addLinkButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  linksContainer: {
    marginTop: 12,
    gap: 8,
  },
  linkChip: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  linkChipText: {
    flex: 1,
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  participantsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  participantChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  participantChipText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
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
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
});
