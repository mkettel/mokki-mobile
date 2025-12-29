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
import { StayWithExpense } from "@/lib/api/stays";

interface EditStayModalProps {
  visible: boolean;
  stay: StayWithExpense | null;
  onClose: () => void;
  onSubmit: (data: {
    checkIn: string;
    checkOut: string;
    notes?: string;
    guestCount: number;
  }) => Promise<void>;
  guestNightlyRate: number;
}

export function EditStayModal({ visible, stay, onClose, onSubmit, guestNightlyRate }: EditStayModalProps) {
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [checkIn, setCheckIn] = useState(new Date());
  const [checkOut, setCheckOut] = useState(new Date());
  const [notes, setNotes] = useState("");
  const [guestCount, setGuestCount] = useState(0);

  // Date picker visibility (for Android)
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);

  // Reset form when stay changes
  useEffect(() => {
    if (stay) {
      setCheckIn(new Date(stay.check_in));
      setCheckOut(new Date(stay.check_out));
      setNotes(stay.notes || "");
      setGuestCount(stay.guest_count || 0);
    }
  }, [stay]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async () => {
    // Validate dates
    if (checkOut <= checkIn) {
      Alert.alert("Invalid Dates", "Check-out must be after check-in");
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        checkIn: checkIn.toISOString().split("T")[0],
        checkOut: checkOut.toISOString().split("T")[0],
        notes: notes.trim() || undefined,
        guestCount,
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

  // Calculate nights and guest fee
  const nights = Math.max(
    1,
    Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  );
  const guestFee = guestCount * nights * guestNightlyRate;

  const incrementGuests = () => {
    if (guestCount < 20) setGuestCount(guestCount + 1);
  };

  const decrementGuests = () => {
    if (guestCount > 0) setGuestCount(guestCount - 1);
  };

  if (!stay) return null;

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
            Edit Stay
          </Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Check-in Date */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Check-in
            </Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
              onPress={() => setShowCheckInPicker(true)}
            >
              <FontAwesome name="calendar" size={16} color={colors.mutedForeground} />
              <Text style={[styles.dateText, { color: colors.foreground }]}>
                {formatDate(checkIn)}
              </Text>
            </TouchableOpacity>
            {(showCheckInPicker || Platform.OS === "ios") && (
              <DateTimePicker
                value={checkIn}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  setShowCheckInPicker(false);
                  if (date) {
                    setCheckIn(date);
                    // Auto-adjust checkout if needed
                    if (date >= checkOut) {
                      setCheckOut(new Date(date.getTime() + 86400000));
                    }
                  }
                }}
                style={Platform.OS === "ios" ? styles.iosPicker : undefined}
              />
            )}
          </View>

          {/* Check-out Date */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Check-out
            </Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
              onPress={() => setShowCheckOutPicker(true)}
            >
              <FontAwesome name="calendar" size={16} color={colors.mutedForeground} />
              <Text style={[styles.dateText, { color: colors.foreground }]}>
                {formatDate(checkOut)}
              </Text>
            </TouchableOpacity>
            {(showCheckOutPicker || Platform.OS === "ios") && (
              <DateTimePicker
                value={checkOut}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  setShowCheckOutPicker(false);
                  if (date) setCheckOut(date);
                }}
                minimumDate={new Date(checkIn.getTime() + 86400000)}
                style={Platform.OS === "ios" ? styles.iosPicker : undefined}
              />
            )}
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Notes (optional)
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
              value={notes}
              onChangeText={setNotes}
              placeholder="Any notes about your stay..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Guest Count */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Bringing Guests?
            </Text>
            {guestNightlyRate > 0 ? (
              <Text style={[styles.sublabel, { color: colors.mutedForeground }]}>
                Extra guests incur a ${guestNightlyRate}/night fee
              </Text>
            ) : (
              <Text style={[styles.sublabel, { color: colors.mutedForeground }]}>
                Extra guests are free
              </Text>
            )}
            <View style={styles.guestCounter}>
              <TouchableOpacity
                style={[
                  styles.counterButton,
                  { backgroundColor: colors.muted, borderColor: colors.border },
                ]}
                onPress={decrementGuests}
                disabled={guestCount === 0}
              >
                <FontAwesome
                  name="minus"
                  size={16}
                  color={guestCount === 0 ? colors.mutedForeground : colors.foreground}
                />
              </TouchableOpacity>
              <Text style={[styles.guestCountText, { color: colors.foreground }]}>
                {guestCount}
              </Text>
              <TouchableOpacity
                style={[
                  styles.counterButton,
                  { backgroundColor: colors.muted, borderColor: colors.border },
                ]}
                onPress={incrementGuests}
                disabled={guestCount === 20}
              >
                <FontAwesome
                  name="plus"
                  size={16}
                  color={guestCount === 20 ? colors.mutedForeground : colors.foreground}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Guest Fee Preview */}
          {guestCount > 0 && nights > 0 && guestNightlyRate > 0 && (
            <View
              style={[
                styles.feePreview,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
            >
              <FontAwesome name="info-circle" size={16} color={colors.primary} />
              <Text style={[styles.feePreviewText, { color: colors.foreground }]}>
                {guestCount} guest{guestCount > 1 ? "s" : ""} × {nights} night
                {nights > 1 ? "s" : ""} × ${guestNightlyRate} ={" "}
                <Text style={styles.feeAmount}>${guestFee}</Text>
              </Text>
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
  sublabel: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginBottom: 12,
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
  textInput: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
    minHeight: 80,
  },
  guestCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  guestCountText: {
    fontSize: 24,
    fontFamily: typography.fontFamily.chillaxSemibold,
    minWidth: 40,
    textAlign: "center",
  },
  feePreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    marginBottom: 24,
  },
  feePreviewText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    flex: 1,
  },
  feeAmount: {
    fontFamily: typography.fontFamily.chillaxSemibold,
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
