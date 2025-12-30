import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useColors } from "@/lib/context/theme";
import { typography } from "@/constants/theme";
import { supabase } from "@/lib/supabase/client";
import {
  getActiveSignupWindow,
  isWindowOpenForDates,
  claimBed,
  getUserBedClaim,
  type SignupWindowWithRoomsAndClaims,
  type RoomWithBedsAndClaims,
  type BedWithClaimStatus,
} from "@/lib/api/bedSignups";
import type { BedSignup, Bed, Room } from "@/types/database";

interface BedSelectionModalProps {
  visible: boolean;
  houseId: string;
  userId: string;
  checkIn: string; // ISO date string
  checkOut: string; // ISO date string
  onClose: () => void;
  onBedSelected: (bedId: string, signupId: string) => void;
  onSkip: () => void;
}

type UserClaimInfo = BedSignup & { beds: Bed & { rooms: Room } };

export function BedSelectionModal({
  visible,
  houseId,
  userId,
  checkIn,
  checkOut,
  onClose,
  onBedSelected,
  onSkip,
}: BedSelectionModalProps) {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [signupWindow, setSignupWindow] = useState<SignupWindowWithRoomsAndClaims | null>(null);
  const [userClaim, setUserClaim] = useState<UserClaimInfo | null>(null);
  const [claimingBedId, setClaimingBedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!visible) return;

    try {
      setLoading(true);
      setError(null);

      // Check if window is open for these dates
      const { isOpen, window: basicWindow } = await isWindowOpenForDates(houseId, checkIn, checkOut);

      if (!isOpen || !basicWindow) {
        setSignupWindow(null);
        setLoading(false);
        return;
      }

      // Get the full window with rooms and claims
      const { window: fullWindow, error: windowError } = await getActiveSignupWindow(houseId);
      if (windowError) throw windowError;

      setSignupWindow(fullWindow);

      // Check if user already has a claim
      if (fullWindow) {
        const { claim } = await getUserBedClaim(fullWindow.id, userId);
        setUserClaim(claim);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error loading bed selection data:", err);
      setError("Failed to load bed data");
      setLoading(false);
    }
  }, [visible, houseId, userId, checkIn, checkOut]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time subscription
  useEffect(() => {
    if (!visible || !signupWindow?.id) return;

    const channel = supabase
      .channel(`bed_selection:${signupWindow.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bed_signups",
          filter: `signup_window_id=eq.${signupWindow.id}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [visible, signupWindow?.id, loadData]);

  const handleClaimBed = async (bed: BedWithClaimStatus) => {
    if (!signupWindow?.id || claimingBedId) return;

    setClaimingBedId(bed.id);
    try {
      const { signup, error: claimError } = await claimBed(
        signupWindow.id,
        bed.id,
        userId
      );

      if (claimError) {
        setError(claimError.message);
        setClaimingBedId(null);
        return;
      }

      if (signup) {
        onBedSelected(bed.id, signup.id);
      }
    } catch (err) {
      console.error("Error claiming bed:", err);
      setError("Failed to claim bed");
    } finally {
      setClaimingBedId(null);
    }
  };

  const rooms = signupWindow?.rooms || [];

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
            Select a Bed
          </Text>
          <View style={styles.closeButton} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              Loading beds...
            </Text>
          </View>
        ) : !signupWindow ? (
          <View style={styles.noWindowContainer}>
            <FontAwesome name="bed" size={48} color={colors.mutedForeground} />
            <Text style={[styles.noWindowTitle, { color: colors.foreground }]}>
              Bed Sign-Up Not Open
            </Text>
            <Text style={[styles.noWindowText, { color: colors.mutedForeground }]}>
              Bed sign-up is not currently open for these dates. You can still create your stay without selecting a bed.
            </Text>
            <TouchableOpacity
              style={[styles.skipButton, { backgroundColor: colors.primary }]}
              onPress={onSkip}
            >
              <Text style={[styles.skipButtonText, { color: colors.primaryForeground }]}>
                Continue Without Bed
              </Text>
            </TouchableOpacity>
          </View>
        ) : userClaim ? (
          <View style={styles.alreadyClaimedContainer}>
            <FontAwesome name="check-circle" size={48} color={colors.primary} />
            <Text style={[styles.alreadyClaimedTitle, { color: colors.foreground }]}>
              You Already Have a Bed
            </Text>
            <Text style={[styles.alreadyClaimedText, { color: colors.mutedForeground }]}>
              You've already claimed a bed for this weekend. Your stay will be linked to your current bed selection.
            </Text>
            <TouchableOpacity
              style={[styles.skipButton, { backgroundColor: colors.primary }]}
              onPress={() => onBedSelected(userClaim.bed_id, userClaim.id)}
            >
              <Text style={[styles.skipButtonText, { color: colors.primaryForeground }]}>
                Continue with Current Bed
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={styles.content}>
            {error && (
              <View style={[styles.errorCard, { backgroundColor: colors.destructive + "20" }]}>
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            )}

            <Text style={[styles.instructions, { color: colors.mutedForeground }]}>
              Select a bed to claim for your stay. This is optional - you can skip if you prefer.
            </Text>

            {rooms.map((room) => (
              <View key={room.id} style={[styles.roomCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.roomHeader}>
                  <FontAwesome
                    name={room.room_type === "bunk_room" ? "th-large" : "bed"}
                    size={16}
                    color={colors.mutedForeground}
                  />
                  <Text style={[styles.roomName, { color: colors.foreground }]}>
                    {room.name}
                  </Text>
                </View>

                <View style={styles.bedList}>
                  {room.beds.map((bed) => {
                    const isClaimed = !!bed.claim;
                    const isLoading = claimingBedId === bed.id;

                    return (
                      <TouchableOpacity
                        key={bed.id}
                        style={[
                          styles.bedRow,
                          {
                            backgroundColor: isClaimed ? colors.muted : colors.background,
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => !isClaimed && handleClaimBed(bed)}
                        disabled={isClaimed || isLoading}
                      >
                        <View style={styles.bedInfo}>
                          <Text style={[styles.bedName, { color: isClaimed ? colors.mutedForeground : colors.foreground }]}>
                            {bed.name}
                          </Text>
                          <Text style={[styles.bedType, { color: colors.mutedForeground }]}>
                            {bed.bed_type.charAt(0).toUpperCase() + bed.bed_type.slice(1)}
                            {bed.is_premium && " (Premium)"}
                          </Text>
                        </View>

                        {isLoading ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : isClaimed ? (
                          <View style={styles.claimedBadge}>
                            <Text style={[styles.claimedText, { color: colors.mutedForeground }]}>
                              Taken
                            </Text>
                          </View>
                        ) : (
                          <View style={[styles.selectButton, { backgroundColor: colors.primary }]}>
                            <Text style={[styles.selectButtonText, { color: colors.primaryForeground }]}>
                              Select
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* Skip option */}
            <TouchableOpacity
              style={[styles.skipOption, { borderColor: colors.border }]}
              onPress={onSkip}
            >
              <FontAwesome name="close" size={16} color={colors.mutedForeground} />
              <Text style={[styles.skipOptionText, { color: colors.mutedForeground }]}>
                Skip - I'll sleep on the couch or bring an air mattress
              </Text>
            </TouchableOpacity>

            <View style={styles.bottomPadding} />
          </ScrollView>
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  noWindowContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  noWindowTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamily.chillaxSemibold,
    marginTop: 16,
    textAlign: "center",
  },
  noWindowText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
  },
  alreadyClaimedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  alreadyClaimedTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamily.chillaxSemibold,
    marginTop: 16,
    textAlign: "center",
  },
  alreadyClaimedText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 22,
  },
  skipButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  skipButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  instructions: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    marginBottom: 20,
    lineHeight: 22,
  },
  errorCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
  },
  roomCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    paddingBottom: 12,
  },
  roomName: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  bedList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  bedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  bedInfo: {
    flex: 1,
  },
  bedName: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  bedType: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  claimedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  claimedText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  selectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  skipOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 8,
  },
  skipOptionText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    flex: 1,
  },
  bottomPadding: {
    height: 40,
  },
});
