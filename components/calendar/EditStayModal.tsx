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
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { FontAwesome } from "@expo/vector-icons";
import { useColors } from "@/lib/context/theme";
import { typography } from "@/constants/theme";
import { StayWithExpense } from "@/lib/api/stays";
import { BedSelectionModal } from "@/components/beds";
import { isWindowOpenForDates, getUserBedClaim } from "@/lib/api/bedSignups";

interface EditStayModalProps {
  visible: boolean;
  stay: StayWithExpense | null;
  onClose: () => void;
  onSubmit: (data: {
    checkIn: string;
    checkOut: string;
    notes?: string;
    guestCount: number;
    bedSignupId?: string;
  }) => Promise<void>;
  guestNightlyRate: number;
  houseId?: string;
  userId?: string;
  bedSignupEnabled?: boolean;
}

export function EditStayModal({
  visible,
  stay,
  onClose,
  onSubmit,
  guestNightlyRate,
  houseId,
  userId,
  bedSignupEnabled = false,
}: EditStayModalProps) {
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [checkIn, setCheckIn] = useState(new Date());
  const [checkOut, setCheckOut] = useState(new Date());
  const [notes, setNotes] = useState("");
  const [guestCount, setGuestCount] = useState(0);

  // Bed selection state
  const [bedSignupId, setBedSignupId] = useState<string | null>(null);
  const [selectedBedName, setSelectedBedName] = useState<string | null>(null);
  const [showBedSelection, setShowBedSelection] = useState(false);
  const [checkingBedWindow, setCheckingBedWindow] = useState(false);
  const [bedWindowOpen, setBedWindowOpen] = useState(false);

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
      // Set existing bed info
      if (stay.bedSignup) {
        setBedSignupId(stay.bedSignup.id);
        setSelectedBedName(`${stay.bedSignup.bedName} (${stay.bedSignup.roomName})`);
      } else {
        setBedSignupId(null);
        setSelectedBedName(null);
      }
    }
  }, [stay]);

  // Check if bed signup window is open for these dates
  useEffect(() => {
    const checkBedWindow = async () => {
      if (!bedSignupEnabled || !houseId || !userId) {
        setBedWindowOpen(false);
        return;
      }

      const checkInStr = checkIn.toISOString().split("T")[0];
      const checkOutStr = checkOut.toISOString().split("T")[0];

      setCheckingBedWindow(true);
      try {
        const { isOpen, window } = await isWindowOpenForDates(houseId, checkInStr, checkOutStr);
        setBedWindowOpen(isOpen);

        // If window is open and user doesn't have existing claim from stay, check for one
        if (isOpen && window && !bedSignupId) {
          const { claim } = await getUserBedClaim(window.id, userId);
          if (claim) {
            setBedSignupId(claim.id);
            const bed = claim.beds;
            const room = bed?.rooms;
            if (bed && room) {
              setSelectedBedName(`${bed.name} (${room.name})`);
            }
          }
        }
      } catch (error) {
        console.error("Error checking bed window:", error);
        setBedWindowOpen(false);
      }
      setCheckingBedWindow(false);
    };

    checkBedWindow();
  }, [bedSignupEnabled, houseId, userId, checkIn, checkOut]);

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
        bedSignupId: bedSignupId || undefined,
      });
      handleClose();
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBedSelected = (bedId: string, signupId: string) => {
    setBedSignupId(signupId);
    setSelectedBedName("Bed selected");
    setShowBedSelection(false);
  };

  const handleBedSkipped = () => {
    setBedSignupId(null);
    setSelectedBedName(null);
    setShowBedSelection(false);
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

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
            {showCheckInPicker && (
              <DateTimePicker
                value={checkIn}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  if (Platform.OS === "android") {
                    setShowCheckInPicker(false);
                  }
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
            {showCheckInPicker && Platform.OS === "ios" && (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowCheckInPicker(false)}
              >
                <Text style={[styles.doneButtonText, { color: colors.primary }]}>
                  Done
                </Text>
              </TouchableOpacity>
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
            {showCheckOutPicker && (
              <DateTimePicker
                value={checkOut}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  if (Platform.OS === "android") {
                    setShowCheckOutPicker(false);
                  }
                  if (date) setCheckOut(date);
                }}
                minimumDate={new Date(checkIn.getTime() + 86400000)}
                style={Platform.OS === "ios" ? styles.iosPicker : undefined}
              />
            )}
            {showCheckOutPicker && Platform.OS === "ios" && (
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setShowCheckOutPicker(false)}
              >
                <Text style={[styles.doneButtonText, { color: colors.primary }]}>
                  Done
                </Text>
              </TouchableOpacity>
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

          {/* Bed Selection */}
          {bedSignupEnabled && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Bed Assignment
              </Text>
              {checkingBedWindow ? (
                <View style={styles.bedLoadingContainer}>
                  <ActivityIndicator size="small" color={colors.mutedForeground} />
                  <Text style={[styles.bedLoadingText, { color: colors.mutedForeground }]}>
                    Checking availability...
                  </Text>
                </View>
              ) : bedWindowOpen ? (
                <TouchableOpacity
                  style={[
                    styles.bedButton,
                    {
                      backgroundColor: bedSignupId ? colors.primary + "15" : colors.muted,
                      borderColor: bedSignupId ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setShowBedSelection(true)}
                >
                  <FontAwesome
                    name="bed"
                    size={16}
                    color={bedSignupId ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.bedButtonText,
                      { color: bedSignupId ? colors.primary : colors.foreground },
                    ]}
                  >
                    {selectedBedName || "Select a bed..."}
                  </Text>
                  <FontAwesome
                    name="chevron-right"
                    size={12}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              ) : selectedBedName ? (
                // Show existing bed but can't change (window closed)
                <View
                  style={[
                    styles.bedButton,
                    { backgroundColor: colors.muted, borderColor: colors.border },
                  ]}
                >
                  <FontAwesome name="bed" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.bedButtonText, { color: colors.foreground }]}>
                    {selectedBedName}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.sublabel, { color: colors.mutedForeground }]}>
                  No bed sign-up window is currently open for these dates
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* Bed Selection Modal */}
        {houseId && userId && (
          <BedSelectionModal
            visible={showBedSelection}
            houseId={houseId}
            userId={userId}
            checkIn={checkIn.toISOString().split("T")[0]}
            checkOut={checkOut.toISOString().split("T")[0]}
            onClose={() => setShowBedSelection(false)}
            onBedSelected={handleBedSelected}
            onSkip={handleBedSkipped}
          />
        )}

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
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100, // Extra padding so content can scroll above keyboard
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
  bedLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  bedLoadingText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  bedButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  bedButtonText: {
    flex: 1,
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
  },
});
