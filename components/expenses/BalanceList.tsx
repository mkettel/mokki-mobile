import { typography } from "@/constants/theme";
import { formatCurrency } from "@/lib/api/expenses";
import { useColors } from "@/lib/context/theme";
import type { UserBalance } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface BalanceListProps {
  balances: UserBalance[];
  onSettleAll: (userId: string) => Promise<void>;
}

export function BalanceList({ balances, onSettleAll }: BalanceListProps) {
  const colors = useColors();

  const handlePayViaVenmo = (balance: UserBalance) => {
    if (!balance.venmoHandle) {
      Alert.alert("No Venmo", "This user hasn't set up their Venmo handle.");
      return;
    }

    const amount = Math.abs(balance.netBalance).toFixed(2);
    const note = "Settling up for house expenses"; // Venmo handles spaces correctly without encoding
    const venmoUrl = `venmo://paycharge?txn=pay&recipients=${balance.venmoHandle}&amount=${amount}&note=${note}`;
    const webUrl = `https://venmo.com/${balance.venmoHandle}?txn=pay&amount=${amount}&note=${encodeURIComponent(note)}`;

    Linking.canOpenURL(venmoUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(venmoUrl);
        } else {
          Linking.openURL(webUrl);
        }
      })
      .catch(() => {
        Linking.openURL(webUrl);
      });
  };

  const handleMarkPaid = async (balance: UserBalance) => {
    const message = `Mark all expenses with ${balance.displayName || "this user"} as settled?`;

    // Use window.confirm on web, Alert on native
    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        try {
          await onSettleAll(balance.userId);
          window.alert("Marked as paid!");
        } catch (error) {
          window.alert("Error: " + (error as Error).message);
        }
      }
    } else {
      Alert.alert("Mark as Paid", message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Paid",
          onPress: async () => {
            try {
              await onSettleAll(balance.userId);
            } catch (error) {
              Alert.alert("Error", (error as Error).message);
            }
          },
        },
      ]);
    }
  };

  const getInitial = (balance: UserBalance) => {
    if (balance.displayName) {
      return balance.displayName.charAt(0).toUpperCase();
    }
    return "?";
  };

  if (balances.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome
          name="check-circle"
          size={48}
          color={colors.mutedForeground}
        />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          All settled up!
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
          No outstanding balances with anyone.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {balances.map((balance) => {
        const theyOweYou = balance.netBalance > 0;
        const youOweThem = balance.netBalance < 0;

        return (
          <View
            key={balance.userId}
            style={[styles.balanceCard, { backgroundColor: colors.card }]}
          >
            <View style={styles.userInfo}>
              {/* Avatar */}
              <View
                style={[styles.avatar, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.avatarText}>{getInitial(balance)}</Text>
              </View>

              {/* Name and balance info */}
              <View style={styles.nameContainer}>
                <Text style={[styles.userName, { color: colors.foreground }]}>
                  {balance.displayName || "Unknown User"}
                </Text>
                <View style={styles.balanceRow}>
                  {theyOweYou && (
                    <Text style={[styles.balanceText, { color: "#16a34a" }]}>
                      owes you {formatCurrency(balance.owes)}
                    </Text>
                  )}
                  {youOweThem && (
                    <Text style={[styles.balanceText, { color: "#dc2626" }]}>
                      you owe {formatCurrency(balance.owed)}
                    </Text>
                  )}
                </View>
              </View>

              {/* Net amount */}
              <View style={styles.netContainer}>
                <Text
                  style={[
                    styles.netAmount,
                    { color: theyOweYou ? "#16a34a" : "#dc2626" },
                  ]}
                >
                  {theyOweYou ? "+" : "-"}
                  {formatCurrency(Math.abs(balance.netBalance))}
                </Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actions}>
              {theyOweYou && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: "#16a34a" }]}
                  onPress={() => handleMarkPaid(balance)}
                >
                  <FontAwesome name="check" size={12} color="#fff" />
                  <Text style={styles.actionButtonText}>Mark Paid</Text>
                </TouchableOpacity>
              )}
              {youOweThem && balance.venmoHandle && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: "#3b82f6" }]}
                  onPress={() => handlePayViaVenmo(balance)}
                >
                  <FontAwesome name="dollar" size={12} color="#fff" />
                  <Text style={styles.actionButtonText}>Pay via Venmo</Text>
                </TouchableOpacity>
              )}
              {youOweThem && !balance.venmoHandle && (
                <View
                  style={[styles.noVenmoTag, { backgroundColor: colors.muted }]}
                >
                  <Text
                    style={[
                      styles.noVenmoText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    No Venmo set up
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
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
  balanceCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  nameContainer: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  balanceRow: {
    flexDirection: "row",
    marginTop: 2,
  },
  balanceText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  netContainer: {
    marginLeft: 12,
  },
  netAmount: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  actions: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  noVenmoTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  noVenmoText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
});
