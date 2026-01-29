import React, { useState, useEffect } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { FontAwesome } from "@expo/vector-icons";
import { useColors } from "@/lib/context/theme";
import { typography } from "@/constants/theme";

interface ChangeTripDatesModalProps {
  visible: boolean;
  currentStartDate: string;
  currentEndDate?: string;
  onClose: () => void;
  onSave: (startDate: string, endDate: string) => Promise<void>;
}

// Parse a YYYY-MM-DD string as local date
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Format date as YYYY-MM-DD
function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Format date for display (e.g., "Jan 15, 2025")
function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ChangeTripDatesModal({
  visible,
  currentStartDate,
  currentEndDate,
  onClose,
  onSave,
}: ChangeTripDatesModalProps) {
  const colors = useColors();

  const [startDate, setStartDate] = useState<Date>(() =>
    parseLocalDate(currentStartDate)
  );
  const [endDate, setEndDate] = useState<Date>(() =>
    currentEndDate ? parseLocalDate(currentEndDate) : parseLocalDate(currentStartDate)
  );
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset dates when modal opens with new values
  useEffect(() => {
    if (visible) {
      setStartDate(parseLocalDate(currentStartDate));
      setEndDate(
        currentEndDate
          ? parseLocalDate(currentEndDate)
          : parseLocalDate(currentStartDate)
      );
    }
  }, [visible, currentStartDate, currentEndDate]);

  const handleStartDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowStartPicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
      // If end date is before new start date, adjust it
      if (selectedDate > endDate) {
        setEndDate(selectedDate);
      }
    }
  };

  const handleEndDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowEndPicker(false);
    }
    if (selectedDate) {
      // Ensure end date is not before start date
      if (selectedDate >= startDate) {
        setEndDate(selectedDate);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formatDateString(startDate), formatDateString(endDate));
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Change Trip Dates
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome name="times" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Date Pickers */}
          <View style={styles.dateSection}>
            {/* Start Date */}
            <View style={styles.dateRow}>
              <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
                Start Date
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  { backgroundColor: colors.muted, borderColor: colors.border },
                ]}
                onPress={() => setShowStartPicker(true)}
              >
                <FontAwesome
                  name="calendar"
                  size={14}
                  color={colors.mutedForeground}
                  style={styles.calendarIcon}
                />
                <Text style={[styles.dateText, { color: colors.foreground }]}>
                  {formatDisplayDate(startDate)}
                </Text>
              </TouchableOpacity>
            </View>

            {showStartPicker && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleStartDateChange}
                  style={Platform.OS === "ios" ? styles.iosPicker : undefined}
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    style={[styles.doneButton, { backgroundColor: colors.primary }]}
                    onPress={() => setShowStartPicker(false)}
                  >
                    <Text style={[styles.doneButtonText, { color: colors.primaryForeground }]}>
                      Done
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* End Date */}
            <View style={styles.dateRow}>
              <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
                End Date
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  { backgroundColor: colors.muted, borderColor: colors.border },
                ]}
                onPress={() => setShowEndPicker(true)}
              >
                <FontAwesome
                  name="calendar"
                  size={14}
                  color={colors.mutedForeground}
                  style={styles.calendarIcon}
                />
                <Text style={[styles.dateText, { color: colors.foreground }]}>
                  {formatDisplayDate(endDate)}
                </Text>
              </TouchableOpacity>
            </View>

            {showEndPicker && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleEndDateChange}
                  minimumDate={startDate}
                  style={Platform.OS === "ios" ? styles.iosPicker : undefined}
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    style={[styles.doneButton, { backgroundColor: colors.primary }]}
                    onPress={() => setShowEndPicker(false)}
                  >
                    <Text style={[styles.doneButtonText, { color: colors.primaryForeground }]}>
                      Done
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.primary },
                isSaving && styles.disabledButton,
              ]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  closeButton: {
    padding: 4,
  },
  dateSection: {
    gap: 16,
  },
  dateRow: {
    gap: 8,
  },
  dateLabel: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  calendarIcon: {
    marginRight: 10,
  },
  dateText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
  },
  pickerContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  iosPicker: {
    height: 150,
  },
  doneButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  doneButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
