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
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { FontAwesome } from "@expo/vector-icons";
import { useColors } from "@/lib/context/theme";
import { typography } from "@/constants/theme";
import type {
  ItineraryEventWithDetails,
  ItineraryEventCategory,
  ItineraryLink,
  ItineraryChecklistItem,
} from "@/types/database";

interface EditEventModalProps {
  visible: boolean;
  event: ItineraryEventWithDetails | null;
  onClose: () => void;
  onSubmit: (data: {
    title?: string;
    description?: string | null;
    eventDate?: string;
    startTime?: string | null;
    endTime?: string | null;
    location?: string | null;
    category?: ItineraryEventCategory | null;
    isOptional?: boolean;
    capacity?: number | null;
    links?: ItineraryLink[];
    checklist?: ItineraryChecklistItem[];
  }) => Promise<void>;
  onDelete: () => void;
}

const CATEGORIES: { id: ItineraryEventCategory; label: string; icon: string }[] = [
  { id: "meal", label: "Meal", icon: "cutlery" },
  { id: "workshop", label: "Workshop", icon: "pencil" },
  { id: "activity", label: "Activity", icon: "bolt" },
  { id: "free_time", label: "Free Time", icon: "coffee" },
  { id: "travel", label: "Travel", icon: "car" },
  { id: "other", label: "Other", icon: "star" },
];

// Parse time string (HH:MM) to Date
function parseTimeString(timeString: string | null): Date {
  const date = new Date();
  if (timeString) {
    const [hours, minutes] = timeString.split(":").map(Number);
    date.setHours(hours, minutes, 0, 0);
  } else {
    date.setHours(9, 0, 0, 0);
  }
  return date;
}

// Format time as HH:MM
function formatTimeString(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Format time for display (e.g., "9:00 AM")
function formatTimeDisplay(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function EditEventModal({
  visible,
  event,
  onClose,
  onSubmit,
  onDelete,
}: EditEventModalProps) {
  const colors = useColors();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date>(new Date());
  const [hasEndTime, setHasEndTime] = useState(true);
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<ItineraryEventCategory>("activity");
  const [isOptional, setIsOptional] = useState(false);
  const [capacity, setCapacity] = useState("");
  const [links, setLinks] = useState<ItineraryLink[]>([]);
  const [checklist, setChecklist] = useState<ItineraryChecklistItem[]>([]);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");

  // Picker visibility
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Populate form with event data when modal opens
  useEffect(() => {
    if (visible && event) {
      setTitle(event.title);
      setDescription(event.description || "");
      setStartTime(parseTimeString(event.start_time));
      setEndTime(parseTimeString(event.end_time));
      setHasEndTime(!!event.end_time);
      setLocation(event.location || "");
      setCategory(event.category || "activity");
      setIsOptional(event.is_optional);
      setCapacity(event.capacity?.toString() || "");
      setLinks(event.links || []);
      setChecklist(event.checklist || []);
      setNewLinkLabel("");
      setNewLinkUrl("");
      setNewChecklistItem("");
    }
  }, [visible, event]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter an event title");
      return;
    }

    if (hasEndTime && endTime <= startTime) {
      Alert.alert("Error", "End time must be after start time");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        startTime: formatTimeString(startTime),
        endTime: hasEndTime ? formatTimeString(endTime) : null,
        location: location.trim() || null,
        category,
        isOptional,
        capacity: capacity ? parseInt(capacity, 10) : null,
        links,
        checklist,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addLink = () => {
    if (newLinkLabel.trim() && newLinkUrl.trim()) {
      // Normalize URL - add https:// if no protocol
      let url = newLinkUrl.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = `https://${url}`;
      }
      setLinks([...links, { label: newLinkLabel.trim(), url }]);
      setNewLinkLabel("");
      setNewLinkUrl("");
    }
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklist([...checklist, { text: newChecklistItem.trim() }]);
      setNewChecklistItem("");
    }
  };

  const removeChecklistItem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  if (!event) return null;

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
            Edit Event
          </Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Title
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="Event title"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Category
            </Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryButton,
                    {
                      backgroundColor:
                        category === cat.id ? colors.primary : colors.muted,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <FontAwesome
                    name={cat.icon as any}
                    size={14}
                    color={category === cat.id ? colors.primaryForeground : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.categoryButtonText,
                      {
                        color:
                          category === cat.id
                            ? colors.primaryForeground
                            : colors.foreground,
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Start Time */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Start Time
            </Text>
            <TouchableOpacity
              style={[
                styles.timeButton,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
              onPress={() => setShowStartPicker(true)}
            >
              <FontAwesome name="clock-o" size={16} color={colors.mutedForeground} />
              <Text style={[styles.timeText, { color: colors.foreground }]}>
                {formatTimeDisplay(startTime)}
              </Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  if (Platform.OS === "android") {
                    setShowStartPicker(false);
                  }
                  if (date) setStartTime(date);
                }}
                style={Platform.OS === "ios" ? styles.iosPicker : undefined}
              />
            )}
            {showStartPicker && Platform.OS === "ios" && (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowStartPicker(false)}
              >
                <Text style={[styles.doneButtonText, { color: colors.primary }]}>
                  Done
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* End Time */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                End Time
              </Text>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setHasEndTime(!hasEndTime)}
              >
                <FontAwesome
                  name={hasEndTime ? "toggle-on" : "toggle-off"}
                  size={20}
                  color={hasEndTime ? colors.primary : colors.mutedForeground}
                />
              </TouchableOpacity>
            </View>
            {hasEndTime && (
              <>
                <TouchableOpacity
                  style={[
                    styles.timeButton,
                    { backgroundColor: colors.muted, borderColor: colors.border },
                  ]}
                  onPress={() => setShowEndPicker(true)}
                >
                  <FontAwesome name="clock-o" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.timeText, { color: colors.foreground }]}>
                    {formatTimeDisplay(endTime)}
                  </Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker
                    value={endTime}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(event, date) => {
                      if (Platform.OS === "android") {
                        setShowEndPicker(false);
                      }
                      if (date) setEndTime(date);
                    }}
                    style={Platform.OS === "ios" ? styles.iosPicker : undefined}
                  />
                )}
                {showEndPicker && Platform.OS === "ios" && (
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => setShowEndPicker(false)}
                  >
                    <Text style={[styles.doneButtonText, { color: colors.primary }]}>
                      Done
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* Location */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Location (optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              value={location}
              onChangeText={setLocation}
              placeholder="Where is this happening?"
              placeholderTextColor={colors.mutedForeground}
            />
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
              placeholder="Add details about this event..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Optional Toggle */}
          <TouchableOpacity
            style={[styles.optionRow, { borderColor: colors.border }]}
            onPress={() => setIsOptional(!isOptional)}
          >
            <View style={styles.optionInfo}>
              <Text style={[styles.optionLabel, { color: colors.foreground }]}>
                Optional Event
              </Text>
              <Text
                style={[styles.optionDescription, { color: colors.mutedForeground }]}
              >
                Attendees can choose to join
              </Text>
            </View>
            <FontAwesome
              name={isOptional ? "toggle-on" : "toggle-off"}
              size={24}
              color={isOptional ? colors.primary : colors.mutedForeground}
            />
          </TouchableOpacity>

          {/* Capacity (only if optional) */}
          {isOptional && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Capacity (optional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.muted,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                value={capacity}
                onChangeText={setCapacity}
                placeholder="Maximum attendees"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
              />
            </View>
          )}

          {/* Links */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Links (optional)
            </Text>
            {links.map((link, index) => (
              <View key={index} style={styles.listItem}>
                <View style={styles.listItemContent}>
                  <Text style={[styles.listItemText, { color: colors.foreground }]}>
                    {link.label}
                  </Text>
                  <Text
                    style={[styles.listItemSubtext, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {link.url}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeLink(index)}>
                  <FontAwesome name="times" size={16} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.addItemRow}>
              <TextInput
                style={[
                  styles.addItemInput,
                  {
                    backgroundColor: colors.muted,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                value={newLinkLabel}
                onChangeText={setNewLinkLabel}
                placeholder="Label"
                placeholderTextColor={colors.mutedForeground}
              />
              <TextInput
                style={[
                  styles.addItemInput,
                  { flex: 2 },
                  {
                    backgroundColor: colors.muted,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                value={newLinkUrl}
                onChangeText={setNewLinkUrl}
                placeholder="URL"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="url"
              />
              <TouchableOpacity
                style={[styles.addItemButton, { backgroundColor: colors.primary }]}
                onPress={addLink}
              >
                <FontAwesome name="plus" size={14} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Checklist */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              What to Bring (optional)
            </Text>
            {checklist.map((item, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={[styles.listItemText, { color: colors.foreground }]}>
                  {item.text}
                </Text>
                <TouchableOpacity onPress={() => removeChecklistItem(index)}>
                  <FontAwesome name="times" size={16} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.addItemRow}>
              <TextInput
                style={[
                  styles.addItemInput,
                  { flex: 1 },
                  {
                    backgroundColor: colors.muted,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                value={newChecklistItem}
                onChangeText={setNewChecklistItem}
                placeholder="Add item"
                placeholderTextColor={colors.mutedForeground}
                onSubmitEditing={addChecklistItem}
              />
              <TouchableOpacity
                style={[styles.addItemButton, { backgroundColor: colors.primary }]}
                onPress={addChecklistItem}
              >
                <FontAwesome name="plus" size={14} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              isSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text
              style={[styles.submitButtonText, { color: colors.primaryForeground }]}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
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
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  toggleButton: {
    padding: 4,
  },
  input: {
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
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  categoryButtonText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  timeText: {
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
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  optionDescription: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.03)",
    marginBottom: 8,
  },
  listItemContent: {
    flex: 1,
    marginRight: 12,
  },
  listItemText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  listItemSubtext: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  addItemRow: {
    flexDirection: "row",
    gap: 8,
  },
  addItemInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  addItemButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
});
