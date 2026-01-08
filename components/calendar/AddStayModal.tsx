import React, { useState, useEffect, useCallback } from "react";
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
  Image,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { FontAwesome } from "@expo/vector-icons";
import { useColors } from "@/lib/context/theme";
import { typography } from "@/constants/theme";
import { isWindowOpenForDates, getUserBedClaim } from "@/lib/api/bedSignups";
import { BedSelectionModal } from "@/components/beds";
import { CoBookerPicker } from "./CoBookerPicker";
import type { BedSignup, Bed, Room, Profile, SignupWindow } from "@/types/database";
import { formatLocalDate } from "@/lib/utils/dates";

type UserClaimInfo = BedSignup & { beds: Bed & { rooms: Room } };

interface AddStayModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    checkIn: string;
    checkOut: string;
    notes?: string;
    guestCount: number;
    bedSignupId?: string;
    coBookerId?: string;
  }) => Promise<void>;
  guestNightlyRate: number;
  houseId?: string;
  userId?: string;
  bedSignupEnabled?: boolean;
}

export function AddStayModal({
  visible,
  onClose,
  onSubmit,
  guestNightlyRate,
  houseId,
  userId,
  bedSignupEnabled = false,
}: AddStayModalProps) {
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [checkIn, setCheckIn] = useState(new Date());
  const [checkOut, setCheckOut] = useState(new Date(Date.now() + 86400000)); // Tomorrow
  const [notes, setNotes] = useState("");
  const [guestCount, setGuestCount] = useState(0);

  // Bed selection state
  const [bedSignupId, setBedSignupId] = useState<string | null>(null);
  const [selectedBedName, setSelectedBedName] = useState<string | null>(null);
  const [showBedSelection, setShowBedSelection] = useState(false);
  const [checkingBedWindow, setCheckingBedWindow] = useState(false);
  const [bedWindowOpen, setBedWindowOpen] = useState(false);
  const [existingClaim, setExistingClaim] = useState<UserClaimInfo | null>(null);
  const [signupWindow, setSignupWindow] = useState<SignupWindow | null>(null);

  // Co-booker state
  const [coBooker, setCoBooker] = useState<Profile | null>(null);
  const [showCoBookerPicker, setShowCoBookerPicker] = useState(false);

  // Date picker visibility (for Android)
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);

  // Check if bed signup window is open for selected dates
  const checkBedWindow = useCallback(async () => {
    if (!bedSignupEnabled || !houseId || !userId) {
      setBedWindowOpen(false);
      setSignupWindow(null);
      return;
    }

    setCheckingBedWindow(true);
    try {
      const checkInStr = formatLocalDate(checkIn);
      const checkOutStr = formatLocalDate(checkOut);
      const { isOpen, window } = await isWindowOpenForDates(houseId, checkInStr, checkOutStr);

      setBedWindowOpen(isOpen);
      setSignupWindow(window);

      if (isOpen && window) {
        // Check if user already has a claim for this window
        const { claim } = await getUserBedClaim(window.id, userId);
        setExistingClaim(claim);
        if (claim) {
          setBedSignupId(claim.id);
        }
      } else {
        setExistingClaim(null);
      }
    } catch (error) {
      console.error("Error checking bed window:", error);
      setBedWindowOpen(false);
      setSignupWindow(null);
    } finally {
      setCheckingBedWindow(false);
    }
  }, [bedSignupEnabled, houseId, userId, checkIn, checkOut]);

  useEffect(() => {
    if (visible) {
      checkBedWindow();
    }
  }, [visible, checkIn, checkOut, checkBedWindow]);

  const resetForm = () => {
    setCheckIn(new Date());
    setCheckOut(new Date(Date.now() + 86400000));
    setNotes("");
    setGuestCount(0);
    setBedSignupId(null);
    setSelectedBedName(null);
    setBedWindowOpen(false);
    setExistingClaim(null);
    setSignupWindow(null);
    setCoBooker(null);
  };

  const handleClose = () => {
    resetForm();
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
        checkIn: formatLocalDate(checkIn),
        checkOut: formatLocalDate(checkOut),
        notes: notes.trim() || undefined,
        guestCount,
        bedSignupId: bedSignupId || undefined,
        coBookerId: coBooker?.id,
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
    // We could fetch the bed name here, but for simplicity just show "Bed selected"
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
            Add Stay
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
                minimumDate={new Date()}
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

          {/* Co-Booker Selection */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Booking with Partner?
            </Text>
            <Text style={[styles.sublabel, { color: colors.mutedForeground }]}>
              Add a co-booker to share this stay (and bed if selected)
            </Text>
            <TouchableOpacity
              style={[
                styles.coBookerButton,
                {
                  backgroundColor: coBooker ? colors.primary + "15" : colors.muted,
                  borderColor: coBooker ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setShowCoBookerPicker(true)}
            >
              {coBooker ? (
                <>
                  <View style={styles.coBookerInfo}>
                    {coBooker.avatar_url ? (
                      <Image
                        source={{ uri: coBooker.avatar_url }}
                        style={styles.coBookerAvatar}
                      />
                    ) : (
                      <View style={[styles.coBookerAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                        <Text style={styles.coBookerAvatarText}>
                          {(coBooker.display_name || coBooker.email || "?").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.coBookerName, { color: colors.foreground }]}>
                      {coBooker.display_name || coBooker.email}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setCoBooker(null);
                    }}
                    style={styles.clearCoBookerButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <FontAwesome name="times-circle" size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <FontAwesome name="user-plus" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.coBookerPlaceholder, { color: colors.mutedForeground }]}>
                    Add co-booker (optional)
                  </Text>
                  <FontAwesome name="chevron-right" size={12} color={colors.mutedForeground} />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Bed Selection - Only show if bed signup is enabled and window is open */}
          {bedSignupEnabled && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Bed Selection
              </Text>
              {checkingBedWindow ? (
                <View style={styles.bedCheckingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.bedCheckingText, { color: colors.mutedForeground }]}>
                    Checking availability...
                  </Text>
                </View>
              ) : bedWindowOpen ? (
                <View>
                  {existingClaim ? (
                    <View
                      style={[
                        styles.bedSelectedCard,
                        { backgroundColor: colors.primary + "20", borderColor: colors.primary },
                      ]}
                    >
                      <FontAwesome name="check-circle" size={18} color={colors.primary} />
                      <View style={styles.bedSelectedInfo}>
                        <Text style={[styles.bedSelectedLabel, { color: colors.mutedForeground }]}>
                          Your bed for this weekend
                        </Text>
                        <Text style={[styles.bedSelectedName, { color: colors.foreground }]}>
                          Already claimed
                        </Text>
                      </View>
                    </View>
                  ) : bedSignupId ? (
                    <View
                      style={[
                        styles.bedSelectedCard,
                        { backgroundColor: colors.primary + "20", borderColor: colors.primary },
                      ]}
                    >
                      <FontAwesome name="bed" size={18} color={colors.primary} />
                      <View style={styles.bedSelectedInfo}>
                        <Text style={[styles.bedSelectedLabel, { color: colors.mutedForeground }]}>
                          Selected
                        </Text>
                        <Text style={[styles.bedSelectedName, { color: colors.foreground }]}>
                          {selectedBedName || "Bed selected"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.changeBedButton, { borderColor: colors.border }]}
                        onPress={() => setShowBedSelection(true)}
                      >
                        <Text style={[styles.changeBedText, { color: colors.primary }]}>
                          Change
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.selectBedButton,
                        { backgroundColor: colors.muted, borderColor: colors.border },
                      ]}
                      onPress={() => setShowBedSelection(true)}
                    >
                      <FontAwesome name="bed" size={18} color={colors.mutedForeground} />
                      <View style={styles.selectBedContent}>
                        <Text style={[styles.selectBedTitle, { color: colors.foreground }]}>
                          Select a Bed
                        </Text>
                        <Text style={[styles.selectBedSubtitle, { color: colors.mutedForeground }]}>
                          Bed sign-up is open for this weekend
                        </Text>
                      </View>
                      <FontAwesome name="chevron-right" size={14} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Text style={[styles.bedNotAvailable, { color: colors.mutedForeground }]}>
                  Bed sign-up is not open for these dates
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
            checkIn={formatLocalDate(checkIn)}
            checkOut={formatLocalDate(checkOut)}
            onClose={() => setShowBedSelection(false)}
            onBedSelected={handleBedSelected}
            onSkip={handleBedSkipped}
          />
        )}

        {/* Co-Booker Picker Modal */}
        {houseId && userId && (
          <CoBookerPicker
            visible={showCoBookerPicker}
            onClose={() => setShowCoBookerPicker(false)}
            onSelectMember={(member) => {
              setCoBooker(member);
              setShowCoBookerPicker(false);
            }}
            onClear={() => {
              setCoBooker(null);
              setShowCoBookerPicker(false);
            }}
            selectedMember={coBooker}
            houseId={houseId}
            excludeUserId={userId}
            signupWindowId={bedWindowOpen && signupWindow ? signupWindow.id : undefined}
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
              {isLoading ? "Adding..." : "Add Stay"}
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
  bedCheckingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  bedCheckingText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  bedSelectedCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  bedSelectedInfo: {
    flex: 1,
  },
  bedSelectedLabel: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
  bedSelectedName: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginTop: 2,
  },
  changeBedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  changeBedText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  selectBedButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  selectBedContent: {
    flex: 1,
  },
  selectBedTitle: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  selectBedSubtitle: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  bedNotAvailable: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    paddingVertical: 8,
  },
  coBookerButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  coBookerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  coBookerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  coBookerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  coBookerAvatarText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  coBookerName: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
    flex: 1,
  },
  clearCoBookerButton: {
    padding: 6,
  },
  coBookerPlaceholder: {
    flex: 1,
  },
});
