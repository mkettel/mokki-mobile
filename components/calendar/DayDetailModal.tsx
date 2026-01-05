import React, { useCallback, useEffect, useState } from "react";
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
import type { StayWithExpense } from "@/lib/api/stays";
import { getRoomsAndBeds } from "@/lib/api/bedSignups";
import type { RoomWithBeds } from "@/types/database";

// Colors for different users (same as StaysCalendar)
const STAY_COLORS = [
  "#93c5fd", // blue-300
  "#86efac", // green-300
  "#c4b5fd", // violet-300
  "#fdba74", // orange-300
  "#f9a8d4", // pink-300
  "#5eead4", // teal-300
  "#a5b4fc", // indigo-300
  "#fda4af", // rose-300
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return STAY_COLORS[Math.abs(hash) % STAY_COLORS.length];
}

interface DayDetailModalProps {
  visible: boolean;
  date: Date | null;
  stays: StayWithExpense[];
  onClose: () => void;
  onStayPress: (stay: StayWithExpense) => void;
  houseId?: string;
}

type ViewMode = "people" | "rooms";

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DayDetailModal({
  visible,
  date,
  stays,
  onClose,
  onStayPress,
  houseId,
}: DayDetailModalProps) {
  const colors = useColors();
  const [viewMode, setViewMode] = useState<ViewMode>("people");
  const [rooms, setRooms] = useState<RoomWithBeds[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [roomsLoaded, setRoomsLoaded] = useState(false);

  // Filter stays for the selected date
  const staysForDate = React.useMemo(() => {
    if (!date) return [];
    const targetDateKey = formatDateKey(date);

    return stays.filter((stay) => {
      // Use string-based comparison to avoid timezone issues
      // check_in and check_out are already in YYYY-MM-DD format
      const checkInKey = stay.check_in;
      const checkOutKey = stay.check_out;

      // Simple string comparison works because YYYY-MM-DD sorts correctly
      return targetDateKey >= checkInKey && targetDateKey <= checkOutKey;
    });
  }, [date, stays]);

  // Load rooms when modal opens
  useEffect(() => {
    const loadRooms = async () => {
      if (!houseId || !visible || roomsLoaded) return;

      setIsLoadingRooms(true);
      const { rooms: fetchedRooms, error } = await getRoomsAndBeds(houseId);
      if (!error) {
        setRooms(fetchedRooms);
        setRoomsLoaded(true);
      }
      setIsLoadingRooms(false);
    };

    loadRooms();
  }, [visible, houseId, roomsLoaded]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setViewMode("people");
    }
  }, [visible]);

  const formatDateHeader = (d: Date) => {
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const getDisplayName = (stay: StayWithExpense) => {
    const profile = stay.profiles;
    return profile.display_name || profile.email.split("@")[0];
  };

  const getInitial = (stay: StayWithExpense) => {
    const profile = stay.profiles;
    const name = profile.display_name || profile.email;
    return name.charAt(0).toUpperCase();
  };

  // Format stay duration (e.g., "Fri Jan 3 - Sun Jan 5")
  const formatStayDuration = (stay: StayWithExpense) => {
    const checkIn = stay.check_in;
    const checkOut = stay.check_out;

    const [inYear, inMonth, inDay] = checkIn.split("-").map(Number);
    const [outYear, outMonth, outDay] = checkOut.split("-").map(Number);

    const inDate = new Date(inYear, inMonth - 1, inDay);
    const outDate = new Date(outYear, outMonth - 1, outDay);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const inDayName = dayNames[inDate.getDay()];
    const outDayName = dayNames[outDate.getDay()];
    const inMonthName = monthNames[inMonth - 1];
    const outMonthName = monthNames[outMonth - 1];

    // Same month
    if (inMonth === outMonth && inYear === outYear) {
      return `${inDayName} ${inMonthName} ${inDay} - ${outDayName} ${outDay}`;
    }
    // Different months
    return `${inDayName} ${inMonthName} ${inDay} - ${outDayName} ${outMonthName} ${outDay}`;
  };

  // Create a map of bed_id -> stay for room view
  const bedToStayMap = React.useMemo(() => {
    const map = new Map<string, StayWithExpense>();
    for (const stay of staysForDate) {
      if (stay.bedSignup?.id) {
        // Find the bed_id from the stay's bedSignup
        // The bedSignup has bedName and roomName but we need to match by name
        for (const room of rooms) {
          if (room.name === stay.bedSignup.roomName) {
            const bed = room.beds.find((b) => b.name === stay.bedSignup?.bedName);
            if (bed) {
              map.set(bed.id, stay);
            }
          }
        }
      }
    }
    return map;
  }, [staysForDate, rooms]);

  // Get unassigned stays
  const unassignedStays = React.useMemo(() => {
    return staysForDate.filter((stay) => !stay.bedSignup);
  }, [staysForDate]);

  if (!date) return null;

  const hasRooms = rooms.length > 0 && rooms.some((r) => r.beds.length > 0);

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
          <View style={styles.headerCenter}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {formatDateHeader(date)}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {staysForDate.length} {staysForDate.length === 1 ? "person" : "people"} staying
            </Text>
          </View>
          <View style={styles.closeButton} />
        </View>

        {/* View Mode Toggle */}
        {hasRooms && (
          <View style={[styles.toggleContainer, { backgroundColor: colors.muted }]}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === "people" && { backgroundColor: colors.background },
              ]}
              onPress={() => setViewMode("people")}
            >
              <FontAwesome
                name="user"
                size={14}
                color={viewMode === "people" ? colors.foreground : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.toggleText,
                  {
                    color: viewMode === "people" ? colors.foreground : colors.mutedForeground,
                  },
                ]}
              >
                People
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === "rooms" && { backgroundColor: colors.background },
              ]}
              onPress={() => setViewMode("rooms")}
            >
              <FontAwesome
                name="th-large"
                size={14}
                color={viewMode === "rooms" ? colors.foreground : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.toggleText,
                  {
                    color: viewMode === "rooms" ? colors.foreground : colors.mutedForeground,
                  },
                ]}
              >
                Rooms
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {staysForDate.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome name="calendar-o" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No one staying
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                No stays scheduled for this day
              </Text>
            </View>
          ) : viewMode === "people" ? (
            // People List View
            <View style={styles.peopleList}>
              {staysForDate.map((stay) => (
                <TouchableOpacity
                  key={stay.id}
                  style={[styles.personRow, { borderBottomColor: colors.border }]}
                  onPress={() => onStayPress(stay)}
                >
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: getUserColor(stay.user_id) },
                    ]}
                  >
                    <Text style={styles.avatarText}>{getInitial(stay)}</Text>
                  </View>
                  <View style={styles.personInfo}>
                    <View style={styles.personNameRow}>
                      <Text style={[styles.personName, { color: colors.foreground }]}>
                        {getDisplayName(stay)}
                      </Text>
                      {stay.guest_count > 0 && (
                        <View style={styles.guestBadge}>
                          <FontAwesome
                            name="user-plus"
                            size={10}
                            color={colors.mutedForeground}
                          />
                          <Text
                            style={[styles.guestCount, { color: colors.mutedForeground }]}
                          >
                            +{stay.guest_count}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.stayDuration, { color: colors.primary }]}>
                      {formatStayDuration(stay)}
                    </Text>
                    {stay.bedSignup ? (
                      <Text style={[styles.bedInfo, { color: colors.mutedForeground }]}>
                        {stay.bedSignup.roomName} - {stay.bedSignup.bedName}
                      </Text>
                    ) : (
                      <Text
                        style={[
                          styles.bedInfo,
                          { color: colors.mutedForeground, fontStyle: "italic" },
                        ]}
                      >
                        No bed assigned
                      </Text>
                    )}
                  </View>
                  <FontAwesome
                    name="chevron-right"
                    size={14}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              ))}
            </View>
          ) : isLoadingRooms ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                Loading rooms...
              </Text>
            </View>
          ) : (
            // Room Grid View
            <View style={styles.roomGrid}>
              {rooms.map((room) => {
                const bedsWithOccupants = room.beds.map((bed) => ({
                  bed,
                  occupant: bedToStayMap.get(bed.id),
                }));

                return (
                  <View
                    key={room.id}
                    style={[
                      styles.roomCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
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
                      {bedsWithOccupants.map(({ bed, occupant }) => (
                        <TouchableOpacity
                          key={bed.id}
                          style={[
                            styles.bedRow,
                            {
                              backgroundColor: occupant
                                ? getUserColor(occupant.user_id) + "20"
                                : colors.background,
                              borderColor: occupant
                                ? getUserColor(occupant.user_id)
                                : colors.border,
                            },
                          ]}
                          onPress={() => occupant && onStayPress(occupant)}
                          disabled={!occupant}
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

                          {occupant ? (
                            <View style={styles.occupantInfo}>
                              <View
                                style={[
                                  styles.smallAvatar,
                                  { backgroundColor: getUserColor(occupant.user_id) },
                                ]}
                              >
                                <Text style={styles.smallAvatarText}>
                                  {getInitial(occupant)}
                                </Text>
                              </View>
                              <View style={styles.occupantDetails}>
                                <Text
                                  style={[
                                    styles.occupantName,
                                    { color: colors.foreground },
                                  ]}
                                >
                                  {getDisplayName(occupant)}
                                  {occupant.guest_count > 0 && (
                                    <Text style={{ color: colors.mutedForeground }}>
                                      {" "}+{occupant.guest_count}
                                    </Text>
                                  )}
                                </Text>
                                <Text
                                  style={[
                                    styles.occupantDuration,
                                    { color: colors.primary },
                                  ]}
                                >
                                  {formatStayDuration(occupant)}
                                </Text>
                              </View>
                            </View>
                          ) : (
                            <Text
                              style={[styles.availableText, { color: colors.mutedForeground }]}
                            >
                              Available
                            </Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}

              {/* Unassigned stays section */}
              {unassignedStays.length > 0 && (
                <View
                  style={[
                    styles.roomCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.roomHeader}>
                    <FontAwesome name="question-circle" size={16} color={colors.mutedForeground} />
                    <Text style={[styles.roomName, { color: colors.foreground }]}>
                      Unassigned ({unassignedStays.length})
                    </Text>
                  </View>

                  <View style={styles.bedList}>
                    {unassignedStays.map((stay) => (
                      <TouchableOpacity
                        key={stay.id}
                        style={[
                          styles.bedRow,
                          {
                            backgroundColor: getUserColor(stay.user_id) + "20",
                            borderColor: getUserColor(stay.user_id),
                          },
                        ]}
                        onPress={() => onStayPress(stay)}
                      >
                        <View style={styles.occupantInfo}>
                          <View
                            style={[
                              styles.smallAvatar,
                              { backgroundColor: getUserColor(stay.user_id) },
                            ]}
                          >
                            <Text style={styles.smallAvatarText}>
                              {getInitial(stay)}
                            </Text>
                          </View>
                          <View style={styles.occupantDetails}>
                            <Text
                              style={[styles.occupantName, { color: colors.foreground }]}
                            >
                              {getDisplayName(stay)}
                              {stay.guest_count > 0 && (
                                <Text style={{ color: colors.mutedForeground }}>
                                  {" "}+{stay.guest_count}
                                </Text>
                              )}
                            </Text>
                            <Text
                              style={[
                                styles.occupantDuration,
                                { color: colors.primary },
                              ]}
                            >
                              {formatStayDuration(stay)}
                            </Text>
                          </View>
                        </View>
                        <FontAwesome
                          name="chevron-right"
                          size={14}
                          color={colors.mutedForeground}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>
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
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  toggleContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 16,
    padding: 4,
    borderRadius: 10,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  toggleText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 8,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  // People List View
  peopleList: {
    gap: 0,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxBold,
    color: "#1f2937",
  },
  personInfo: {
    flex: 1,
  },
  personNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  personName: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  guestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  guestCount: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
  bedInfo: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  stayDuration: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginTop: 2,
  },
  // Room Grid View
  roomGrid: {
    gap: 16,
  },
  roomCard: {
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
  bedList: {
    padding: 12,
    paddingTop: 0,
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
  bedName: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  bedType: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  occupantInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  occupantDetails: {
    flex: 1,
  },
  occupantDuration: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
  },
  smallAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  smallAvatarText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxBold,
    color: "#1f2937",
  },
  occupantName: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  availableText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    fontStyle: "italic",
  },
});
