import { typography } from "@/constants/theme";
import type { StayWithExpense } from "@/lib/api/stays";
import { useColors } from "@/lib/context/theme";
import { FontAwesome } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface GuestFeesListProps {
  stays: StayWithExpense[];
  recipientId: string | null;
  currentUserId: string;
  onSettleGuestFee?: (splitId: string) => void;
  onUnsettleGuestFee?: (splitId: string) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

type StayStatus = "current" | "upcoming" | "past";

function getStayStatus(stay: StayWithExpense): StayStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkIn = new Date(stay.check_in);
  checkIn.setHours(0, 0, 0, 0);

  const checkOut = new Date(stay.check_out);
  checkOut.setHours(0, 0, 0, 0);

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

export function GuestFeesList({
  stays,
  recipientId,
  currentUserId,
  onSettleGuestFee,
  onUnsettleGuestFee,
  refreshing,
  onRefresh,
}: GuestFeesListProps) {
  const colors = useColors();

  // Check if current user is the recipient (can manage fees)
  const isRecipient = recipientId ? currentUserId === recipientId : false;

  // Categorize stays
  const categorizedStays = useMemo(() => {
    const current: StayWithExpense[] = [];
    const upcoming: StayWithExpense[] = [];
    const past: StayWithExpense[] = [];

    stays.forEach((stay) => {
      const status = getStayStatus(stay);
      if (status === "current") {
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

  const getDisplayName = (stay: StayWithExpense) => {
    const profile = stay.profiles;
    return profile.display_name || profile.email.split("@")[0];
  };

  const getInitial = (stay: StayWithExpense) => {
    const profile = stay.profiles;
    const name = profile.display_name || profile.email;
    return name.charAt(0).toUpperCase();
  };

  const getNights = (checkIn: string, checkOut: string) => {
    return Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
        (1000 * 60 * 60 * 24)
    );
  };

  if (stays.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="bed" size={48} color={colors.foreground} />
        <Text style={[styles.emptyText, { color: colors.foreground }]}>
          No guest fees
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.foreground }]}>
          Guest fees will appear here when stays include guests.
        </Text>
      </View>
    );
  }

  const renderGuestFeeCard = (stay: StayWithExpense) => {
    if (!stay.linkedExpense) return null;

    const isSettled = stay.linkedExpense.split?.settled ?? false;
    const nights = getNights(stay.check_in, stay.check_out);

    return (
      <View
        key={stay.id}
        style={[styles.card, { backgroundColor: colors.card }]}
      >
        {/* Header: Avatar + Name + Status */}
        <View style={styles.cardHeader}>
          {stay.profiles.avatar_url ? (
            <Image
              source={{ uri: stay.profiles.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text
                style={[styles.avatarText, { color: colors.primaryForeground }]}
              >
                {getInitial(stay)}
              </Text>
            </View>
          )}

          <View style={styles.headerInfo}>
            <Text style={[styles.userName, { color: colors.foreground }]}>
              {getDisplayName(stay)}
            </Text>
            <Text style={[styles.stayInfo, { color: colors.mutedForeground }]}>
              {stay.guest_count} guest{stay.guest_count > 1 ? "s" : ""} x{" "}
              {nights} night{nights > 1 ? "s" : ""}
            </Text>
          </View>

          {/* Amount + Status */}
          <View style={styles.amountContainer}>
            <Text style={[styles.amount, { color: colors.foreground }]}>
              ${stay.linkedExpense.amount.toFixed(0)}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isSettled ? "#dcfce7" : "#fef3c7" },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: isSettled ? "#166534" : "#92400e" },
                ]}
              >
                {isSettled ? "Paid" : "Unpaid"}
              </Text>
            </View>
          </View>
        </View>

        {/* Date range */}
        <Text style={[styles.dateRange, { color: colors.mutedForeground }]}>
          {formatDateRange(stay.check_in, stay.check_out)}
        </Text>

        {/* Action buttons - only for recipient */}
        {isRecipient && stay.linkedExpense.split && (
          <View style={[styles.actions, { borderTopColor: colors.border }]}>
            {isSettled ? (
              <TouchableOpacity
                style={[styles.actionButton, { borderColor: colors.border }]}
                onPress={() =>
                  onUnsettleGuestFee?.(stay.linkedExpense!.split!.id)
                }
              >
                <FontAwesome name="undo" size={12} color={colors.foreground} />
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: colors.foreground },
                  ]}
                >
                  Mark Unpaid
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#16a34a" }]}
                onPress={() =>
                  onSettleGuestFee?.(stay.linkedExpense!.split!.id)
                }
              >
                <FontAwesome name="check" size={12} color="#fff" />
                <Text style={[styles.actionButtonText, { color: "#fff" }]}>
                  Mark Paid
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderSection = (title: string, sectionStays: StayWithExpense[]) => {
    if (sectionStays.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {title}
        </Text>
        {sectionStays.map((stay) => renderGuestFeeCard(stay))}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      {renderSection("Current", categorizedStays.current)}
      {renderSection("Upcoming", categorizedStays.upcoming)}
      {renderSection("Past", categorizedStays.past)}
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
    textAlign: "center",
    paddingHorizontal: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxSemibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
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
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  stayInfo: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  dateRange: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 8,
    marginLeft: 56,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
});
