import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useColors } from "@/lib/context/theme";
import { typography } from "@/constants/theme";
import { supabase } from "@/lib/supabase/client";
import {
  getActiveSignupWindow,
  getNextScheduledWindow,
  claimBed,
  releaseBed,
  getUserBedClaim,
  type SignupWindowWithRoomsAndClaims,
  type RoomWithBedsAndClaims,
  type BedWithClaimStatus,
} from "@/lib/api/bedSignups";
import type { SignupWindow, BedSignup, Bed, Room } from "@/types/database";

interface BedSignupViewProps {
  houseId: string;
  userId: string;
  onBedClaimed?: (bedId: string) => void;
}

type WindowState = "loading" | "no_window" | "scheduled" | "open" | "closed";

type UserClaimInfo = BedSignup & { beds: Bed & { rooms: Room } };

export function BedSignupView({ houseId, userId, onBedClaimed }: BedSignupViewProps) {
  const colors = useColors();
  const [windowState, setWindowState] = useState<WindowState>("loading");
  const [signupWindow, setSignupWindow] = useState<SignupWindowWithRoomsAndClaims | null>(null);
  const [nextWindow, setNextWindow] = useState<SignupWindow | null>(null);
  const [userClaim, setUserClaim] = useState<UserClaimInfo | null>(null);
  const [claimingBedId, setClaimingBedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);

      // Check for active (open) window
      const { window: activeWindow, error: activeError } = await getActiveSignupWindow(houseId);
      if (activeError) throw activeError;

      if (activeWindow) {
        setSignupWindow(activeWindow);
        setWindowState("open");

        // Check if user already has a claim
        const { claim } = await getUserBedClaim(activeWindow.id, userId);
        setUserClaim(claim);
      } else {
        // Check for next scheduled window
        const { window: scheduledWindow } = await getNextScheduledWindow(houseId);
        if (scheduledWindow) {
          setNextWindow(scheduledWindow);
          setWindowState("scheduled");
        } else {
          setWindowState("no_window");
        }
      }
    } catch (err) {
      console.error("Error loading bed signup data:", err);
      setError("Failed to load bed signup data");
      setWindowState("no_window");
    }
  }, [houseId, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time subscription for bed claims
  useEffect(() => {
    if (!signupWindow) return;

    const channel = supabase
      .channel(`bed_signups:${signupWindow.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bed_signups",
          filter: `signup_window_id=eq.${signupWindow.id}`,
        },
        () => {
          // Reload data when any bed signup changes
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [signupWindow?.id, loadData]);

  // Also subscribe to window status changes
  useEffect(() => {
    const channel = supabase
      .channel(`signup_windows:${houseId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "signup_windows",
          filter: `house_id=eq.${houseId}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [houseId, loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleClaimBed = async (bedId: string) => {
    if (!signupWindow || claimingBedId) return;

    setClaimingBedId(bedId);
    try {
      const { signup, error: claimError } = await claimBed(signupWindow.id, bedId, userId);
      if (claimError) {
        setError(claimError.message);
      } else if (signup) {
        onBedClaimed?.(bedId);
      }
      await loadData();
    } catch (err) {
      console.error("Error claiming bed:", err);
      setError("Failed to claim bed");
    } finally {
      setClaimingBedId(null);
    }
  };

  const handleReleaseBed = async () => {
    if (!userClaim) return;

    setClaimingBedId(userClaim.bed_id);
    try {
      const { error: releaseError } = await releaseBed(userClaim.id, userId);
      if (releaseError) {
        setError(releaseError.message);
      } else {
        setUserClaim(null);
      }
      await loadData();
    } catch (err) {
      console.error("Error releasing bed:", err);
      setError("Failed to release bed");
    } finally {
      setClaimingBedId(null);
    }
  };

  const formatWeekendDate = (start: string, end: string) => {
    const startDate = new Date(start + "T00:00:00");
    const endDate = new Date(end + "T00:00:00");
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`;
  };

  const formatOpenTime = (opensAt: string) => {
    const date = new Date(opensAt);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getBedWithClaim = (bedId: string): BedWithClaimStatus | undefined => {
    for (const room of signupWindow?.rooms || []) {
      const bed = room.beds.find(b => b.id === bedId);
      if (bed) return bed;
    }
    return undefined;
  };

  const getTotalBeds = () => signupWindow?.totalBeds || 0;
  const getClaimedBeds = () => signupWindow?.claimedBeds || 0;
  const rooms = signupWindow?.rooms || [];

  if (windowState === "loading") {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          Loading bed sign-up...
        </Text>
      </View>
    );
  }

  if (windowState === "no_window") {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.centerContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <FontAwesome name="bed" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          No Sign-Up Window
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
          Bed sign-up windows are scheduled weekly. Check back soon!
        </Text>
      </ScrollView>
    );
  }

  if (windowState === "scheduled" && nextWindow) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.centerContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <FontAwesome name="clock-o" size={48} color={colors.primary} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          Sign-Up Coming Soon
        </Text>
        <Text style={[styles.scheduledInfo, { color: colors.mutedForeground }]}>
          Bed sign-up for the weekend of{"\n"}
          <Text style={{ color: colors.foreground, fontFamily: typography.fontFamily.chillaxSemibold }}>
            {formatWeekendDate(nextWindow.target_weekend_start, nextWindow.target_weekend_end)}
          </Text>
          {"\n"}opens on{"\n"}
          <Text style={{ color: colors.primary, fontFamily: typography.fontFamily.chillaxSemibold }}>
            {formatOpenTime(nextWindow.opens_at)}
          </Text>
        </Text>
        <Text style={[styles.notifyHint, { color: colors.mutedForeground }]}>
          You'll receive a notification when sign-up opens
        </Text>
      </ScrollView>
    );
  }

  // Open window - show rooms and beds
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Bed Sign-Up
        </Text>
        {signupWindow && (
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            Weekend of {formatWeekendDate(signupWindow.target_weekend_start, signupWindow.target_weekend_end)}
          </Text>
        )}
      </View>

      {/* Progress */}
      <View style={[styles.progressCard, { backgroundColor: colors.muted }]}>
        <View style={styles.progressRow}>
          <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
            Beds Claimed
          </Text>
          <Text style={[styles.progressValue, { color: colors.foreground }]}>
            {getClaimedBeds()} / {getTotalBeds()}
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: getClaimedBeds() === getTotalBeds() ? "#22c55e" : colors.primary,
                width: `${(getClaimedBeds() / getTotalBeds()) * 100}%`,
              },
            ]}
          />
        </View>
        {getClaimedBeds() === getTotalBeds() && (
          <Text style={[styles.allFilledText, { color: "#22c55e" }]}>
            All beds filled! Couches and air mattresses still available.
          </Text>
        )}
      </View>

      {/* User's claim */}
      {userClaim && (
        <View style={[styles.userClaimCard, { backgroundColor: colors.primary + "20", borderColor: colors.primary }]}>
          <View style={styles.userClaimContent}>
            <FontAwesome name="check-circle" size={20} color={colors.primary} />
            <View style={styles.userClaimText}>
              <Text style={[styles.userClaimTitle, { color: colors.foreground }]}>
                Your Bed
              </Text>
              <Text style={[styles.userClaimBed, { color: colors.primary }]}>
                {userClaim.beds.rooms.name} - {userClaim.beds.name}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.releaseButton, { borderColor: colors.destructive }]}
            onPress={handleReleaseBed}
            disabled={claimingBedId === userClaim.bed_id}
          >
            {claimingBedId === userClaim.bed_id ? (
              <ActivityIndicator size="small" color={colors.destructive} />
            ) : (
              <Text style={[styles.releaseButtonText, { color: colors.destructive }]}>
                Release
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Error message */}
      {error && (
        <View style={[styles.errorCard, { backgroundColor: colors.destructive + "20" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      {/* Rooms */}
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

          <View style={styles.bedGrid}>
            {room.beds.map((bed) => {
              const claim = bed.claim;
              const isUserBed = claim?.user_id === userId;
              const isClaimed = !!claim;
              const isLoading = claimingBedId === bed.id;
              const canClaim = !userClaim && !isClaimed;

              return (
                <TouchableOpacity
                  key={bed.id}
                  style={[
                    styles.bedCard,
                    {
                      backgroundColor: isUserBed
                        ? colors.primary + "20"
                        : isClaimed
                        ? colors.muted
                        : colors.background,
                      borderColor: isUserBed
                        ? colors.primary
                        : isClaimed
                        ? colors.border
                        : colors.border,
                    },
                  ]}
                  onPress={() => canClaim && handleClaimBed(bed.id)}
                  disabled={!canClaim || isLoading}
                >
                  <View style={styles.bedInfo}>
                    <Text style={[styles.bedName, { color: colors.foreground }]}>
                      {bed.name}
                    </Text>
                    <Text style={[styles.bedType, { color: colors.mutedForeground }]}>
                      {bed.bed_type.charAt(0).toUpperCase() + bed.bed_type.slice(1)}
                      {bed.is_premium && " (Premium)"}
                    </Text>
                  </View>

                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : isClaimed && claim ? (
                    <View style={styles.claimedBy}>
                      {/* Overlapping avatars for couple */}
                      <View style={styles.avatarStack}>
                        <View style={[styles.claimedAvatar, { backgroundColor: isUserBed ? colors.primary : colors.mutedForeground }]}>
                          <Text style={[styles.claimedInitial, { color: "#fff" }]}>
                            {(claim.profiles?.display_name || claim.profiles?.email || "?").charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        {claim.co_claimer && (
                          <View style={[styles.claimedAvatar, styles.coClaimerAvatar, { backgroundColor: isUserBed || claim.co_claimer.id === userId ? colors.primary : colors.mutedForeground }]}>
                            <Text style={[styles.claimedInitial, { color: "#fff" }]}>
                              {(claim.co_claimer.display_name || claim.co_claimer.email || "?").charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.claimedName, { color: isUserBed || claim.co_claimer?.id === userId ? colors.primary : colors.mutedForeground }]}>
                        {(() => {
                          const primaryName = isUserBed ? "You" : claim.profiles?.display_name || claim.profiles?.email?.split("@")[0] || "Unknown";
                          if (!claim.co_claimer) return primaryName;
                          const coClaimerIsYou = claim.co_claimer.id === userId;
                          const coClaimerName = coClaimerIsYou ? "You" : claim.co_claimer.display_name || claim.co_claimer.email?.split("@")[0] || "Unknown";
                          return `${primaryName} & ${coClaimerName}`;
                        })()}
                      </Text>
                    </View>
                  ) : userClaim ? (
                    <Text style={[styles.availableText, { color: colors.mutedForeground }]}>
                      Available
                    </Text>
                  ) : (
                    <View style={[styles.claimButton, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.claimButtonText, { color: colors.primaryForeground }]}>
                        Claim
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  centerContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamily.chillaxSemibold,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
    marginTop: 8,
  },
  scheduledInfo: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 28,
  },
  notifyHint: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 24,
    textAlign: "center",
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 4,
  },
  progressCard: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  progressValue: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  allFilledText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginTop: 12,
    textAlign: "center",
  },
  userClaimCard: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userClaimContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  userClaimText: {
    flex: 1,
  },
  userClaimTitle: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
  userClaimBed: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  releaseButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  releaseButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  errorCard: {
    marginHorizontal: 20,
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
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
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
  bedGrid: {
    padding: 12,
    paddingTop: 0,
    gap: 8,
  },
  bedCard: {
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
  claimedBy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  claimedAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  coClaimerAvatar: {
    marginLeft: -8,
    borderWidth: 2,
    borderColor: "#fff",
  },
  claimedInitial: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  claimedName: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  availableText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  claimButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  claimButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  bottomPadding: {
    height: 40,
  },
});
