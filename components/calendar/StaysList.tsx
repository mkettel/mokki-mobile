import { typography } from "@/constants/theme";
import type { StayWithExpense } from "@/lib/api/stays";
import { useAuth } from "@/lib/context/auth";
import { useColors } from "@/lib/context/theme";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface StaysListProps {
  stays: StayWithExpense[];
  onEditStay?: (stay: StayWithExpense) => void;
  onDeleteStay?: (stay: StayWithExpense) => void;
  onSettleGuestFee?: (splitId: string) => void;
  onUnsettleGuestFee?: (splitId: string) => void;
  showAll?: boolean;
}

type StayStatus = "current" | "today" | "upcoming" | "past";

function getStayStatus(stay: StayWithExpense): StayStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkIn = new Date(stay.check_in);
  checkIn.setHours(0, 0, 0, 0);

  const checkOut = new Date(stay.check_out);
  checkOut.setHours(0, 0, 0, 0);

  if (checkIn.getTime() === today.getTime()) {
    return "today";
  }
  if (checkIn <= today && checkOut >= today) {
    return "current";
  }
  if (checkIn > today) {
    return "upcoming";
  }
  return "past";
}

function formatDateRange(checkIn: string, checkOut: string): string {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);

  const inMonth = inDate.toLocaleDateString("en-US", { month: "short" });
  const inDay = inDate.getDate();
  const outMonth = outDate.toLocaleDateString("en-US", { month: "short" });
  const outDay = outDate.getDate();
  const year = outDate.getFullYear();

  if (inMonth === outMonth) {
    return `${inMonth} ${inDay} - ${outDay}, ${year}`;
  }
  return `${inMonth} ${inDay} - ${outMonth} ${outDay}, ${year}`;
}

export function StaysList({
  stays,
  onEditStay,
  onDeleteStay,
  onSettleGuestFee,
  onUnsettleGuestFee,
  showAll = false,
}: StaysListProps) {
  const colors = useColors();
  const { user } = useAuth();

  // Categorize stays
  const categorizedStays = React.useMemo(() => {
    const current: StayWithExpense[] = [];
    const upcoming: StayWithExpense[] = [];
    const past: StayWithExpense[] = [];

    stays.forEach((stay) => {
      const status = getStayStatus(stay);
      if (status === "current" || status === "today") {
        current.push(stay);
      } else if (status === "upcoming") {
        upcoming.push(stay);
      } else {
        past.push(stay);
      }
    });

    // Sort each category
    current.sort(
      (a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime()
    );
    upcoming.sort(
      (a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime()
    );
    past.sort(
      (a, b) =>
        new Date(b.check_out).getTime() - new Date(a.check_out).getTime()
    );

    return { current, upcoming, past };
  }, [stays]);

  // Limit display if not showAll
  const displayStays = showAll
    ? [
        ...categorizedStays.current,
        ...categorizedStays.upcoming,
        ...categorizedStays.past,
      ]
    : [...categorizedStays.current, ...categorizedStays.upcoming].slice(0, 10);

  const getDisplayName = (stay: StayWithExpense) => {
    const profile = stay.profiles;
    return profile.display_name || profile.email.split("@")[0];
  };

  const getInitial = (stay: StayWithExpense) => {
    const profile = stay.profiles;
    const name = profile.display_name || profile.email;
    return name.charAt(0).toUpperCase();
  };

  const getStatusBadge = (status: StayStatus) => {
    const configs = {
      current: { bg: colors.primary, text: "#fff", label: "Current" },
      today: { bg: "#22c55e", text: "#fff", label: "Today" },
      upcoming: {
        bg: colors.muted,
        text: colors.foreground,
        label: "Upcoming",
      },
      past: { bg: colors.muted, text: colors.mutedForeground, label: "Past" },
    };
    return configs[status];
  };

  const isOwner = (stay: StayWithExpense) => {
    return user?.id === stay.user_id;
  };

  const isPast = (stay: StayWithExpense) => {
    return getStayStatus(stay) === "past";
  };

  if (displayStays.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="calendar-o" size={48} color={colors.foreground} />
        <Text style={[styles.emptyText, { color: colors.foreground }]}>
          No stays yet
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.foreground }]}>
          Add a stay to see it here
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {displayStays.map((stay) => {
        const status = getStayStatus(stay);
        const statusConfig = getStatusBadge(status);
        const canEdit = isOwner(stay) && !isPast(stay);
        const canDelete = isOwner(stay) && !isPast(stay);

        return (
          <View
            key={stay.id}
            style={[
              styles.stayCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {/* Header row */}
            <View style={styles.cardHeader}>
              {/* Avatar */}
              <View
                style={[styles.avatar, { backgroundColor: colors.primary }]}
              >
                <Text
                  style={[
                    styles.avatarText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  {getInitial(stay)}
                </Text>
              </View>

              {/* Name and status */}
              <View style={styles.headerInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: colors.foreground }]}>
                    {getDisplayName(stay)}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusConfig.bg },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: statusConfig.text }]}
                    >
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>

                {/* Guest count badge */}
                {stay.guest_count > 0 && (
                  <View
                    style={[
                      styles.guestBadge,
                      { backgroundColor: colors.muted },
                    ]}
                  >
                    <FontAwesome
                      name="users"
                      size={10}
                      color={colors.foreground}
                    />
                    <Text
                      style={[styles.guestCount, { color: colors.foreground }]}
                    >
                      {stay.guest_count} guest{stay.guest_count > 1 ? "s" : ""}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action buttons */}
              {(canEdit || canDelete) && (
                <View style={styles.actions}>
                  {canEdit && onEditStay && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => onEditStay(stay)}
                    >
                      <FontAwesome
                        name="pencil"
                        size={14}
                        color={colors.mutedForeground}
                      />
                    </TouchableOpacity>
                  )}
                  {canDelete && onDeleteStay && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => onDeleteStay(stay)}
                    >
                      <FontAwesome
                        name="trash-o"
                        size={14}
                        color={colors.destructive}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Date range */}
            <Text style={[styles.dateRange, { color: colors.mutedForeground }]}>
              {formatDateRange(stay.check_in, stay.check_out)}
            </Text>

            {/* Notes */}
            {stay.notes && (
              <Text style={[styles.notes, { color: colors.mutedForeground }]}>
                {stay.notes}
              </Text>
            )}

            {/* Guest fee info */}
            {stay.linkedExpense && (
              <View
                style={[styles.guestFeeRow, { borderTopColor: colors.border }]}
              >
                <View style={styles.feeInfo}>
                  <FontAwesome
                    name="dollar"
                    size={12}
                    color={colors.foreground}
                  />
                  <Text
                    style={[styles.feeAmount, { color: colors.foreground }]}
                  >
                    ${stay.linkedExpense.amount.toFixed(0)}
                  </Text>
                  {stay.linkedExpense.split && (
                    <View
                      style={[
                        styles.paidBadge,
                        {
                          backgroundColor: stay.linkedExpense.split.settled
                            ? "#dcfce7"
                            : "#fef3c7",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.paidText,
                          {
                            color: stay.linkedExpense.split.settled
                              ? "#166534"
                              : "#92400e",
                          },
                        ]}
                      >
                        {stay.linkedExpense.split.settled ? "Paid" : "Unpaid"}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Settle/Unsettle buttons */}
                {isOwner(stay) && stay.linkedExpense.split && (
                  <View>
                    {stay.linkedExpense.split.settled ? (
                      <TouchableOpacity
                        style={[
                          styles.settleButton,
                          { borderColor: colors.border },
                        ]}
                        onPress={() =>
                          onUnsettleGuestFee?.(stay.linkedExpense!.split!.id)
                        }
                      >
                        <Text
                          style={[
                            styles.settleButtonText,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          Unmark
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.settleButton,
                          { backgroundColor: colors.primary },
                        ]}
                        onPress={() =>
                          onSettleGuestFee?.(stay.linkedExpense!.split!.id)
                        }
                      >
                        <Text
                          style={[styles.settleButtonText, { color: "#fff" }]}
                        >
                          Mark Paid
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}

      {/* Show more indicator */}
      {!showAll && categorizedStays.past.length > 0 && (
        <View style={styles.showMoreContainer}>
          <Text
            style={[styles.showMoreText, { color: colors.mutedForeground }]}
          >
            + {categorizedStays.past.length} past stay
            {categorizedStays.past.length > 1 ? "s" : ""}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  stayCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxBold,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  guestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  guestCount: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  dateRange: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 8,
    marginLeft: 52,
  },
  notes: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 4,
    marginLeft: 52,
    fontStyle: "italic",
  },
  guestFeeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  feeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  feeAmount: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  paidBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  paidText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  settleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "transparent",
  },
  settleButtonText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  showMoreContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  showMoreText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
});
