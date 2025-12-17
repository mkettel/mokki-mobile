import { typography } from "@/constants/theme";
import {
  formatCurrency,
  getBalanceBreakdown,
  getCategoryInfo,
  settleExpenseSplit,
  settleUpWithUser,
  unsettleExpenseSplit,
} from "@/lib/api/expenses";
import { useColors } from "@/lib/context/theme";
import type {
  BalanceBreakdown,
  BalanceBreakdownItem,
  UserBalance,
} from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ReceiptViewer } from "./ReceiptViewer";

interface BalanceDetailModalProps {
  visible: boolean;
  onClose: () => void;
  balance: UserBalance | null;
  houseId: string;
  currentUserId: string;
  houseName?: string;
  onSettled: () => void;
  onEditExpense?: (expenseId: string) => void;
}

export function BalanceDetailModal({
  visible,
  onClose,
  balance,
  houseId,
  currentUserId,
  houseName,
  onSettled,
  onEditExpense,
}: BalanceDetailModalProps) {
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [breakdown, setBreakdown] = useState<BalanceBreakdown | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [receiptToView, setReceiptToView] = useState<{
    url: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    if (visible && balance) {
      loadBreakdown();
    } else {
      setBreakdown(null);
      setExpandedItems(new Set());
    }
  }, [visible, balance]);

  const loadBreakdown = async () => {
    if (!balance) return;

    setIsLoading(true);
    try {
      const { data, error } = await getBalanceBreakdown(
        houseId,
        currentUserId,
        balance.userId
      );
      if (error) {
        console.error("Error loading breakdown:", error);
      } else {
        setBreakdown(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayViaVenmo = () => {
    if (!breakdown?.otherUser.venmoHandle) {
      Alert.alert("No Venmo", "This user hasn't set up their Venmo handle.");
      return;
    }

    const amount = Math.abs(breakdown.netBalance).toFixed(2);
    const note = houseName
      ? `Settling up for ${houseName} expenses`
      : "Settling up for house expenses";
    const venmoUrl = `venmo://paycharge?txn=pay&recipients=${breakdown.otherUser.venmoHandle}&amount=${amount}&note=${note}`;
    const webUrl = `https://venmo.com/${
      breakdown.otherUser.venmoHandle
    }?txn=pay&amount=${amount}&note=${encodeURIComponent(note)}`;

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

  const handleSettleUp = async () => {
    if (!balance) return;

    const message = `Mark all balances with ${
      balance.displayName || "this user"
    } as settled? This will clear all outstanding amounts in both directions.`;

    const doSettle = async () => {
      setIsSettling(true);
      try {
        const { success, settledCount, error } = await settleUpWithUser(
          houseId,
          currentUserId,
          balance.userId
        );
        if (error) {
          Alert.alert("Error", error.message);
        } else if (success) {
          if (Platform.OS === "web") {
            window.alert(
              `Settled ${settledCount} expense${settledCount !== 1 ? "s" : ""}!`
            );
          }
          onSettled();
          onClose();
        }
      } catch (error) {
        Alert.alert("Error", (error as Error).message);
      } finally {
        setIsSettling(false);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        await doSettle();
      }
    } else {
      Alert.alert("Settle Up", message, [
        { text: "Cancel", style: "cancel" },
        { text: "Settle Up", onPress: doSettle },
      ]);
    }
  };

  const handleSettleSingleSplit = async (splitId: string, title: string) => {
    const message = `Mark "${title}" as settled?`;

    const doSettle = async () => {
      try {
        const { success, error } = await settleExpenseSplit(
          splitId,
          currentUserId
        );
        if (error) {
          Alert.alert("Error", error.message);
        } else if (success) {
          await loadBreakdown();
          onSettled();
        }
      } catch (error) {
        Alert.alert("Error", (error as Error).message);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        await doSettle();
      }
    } else {
      Alert.alert("Settle Split", message, [
        { text: "Cancel", style: "cancel" },
        { text: "Settle", onPress: doSettle },
      ]);
    }
  };

  const handleUnsettleSingleSplit = async (splitId: string, title: string) => {
    const message = `Mark "${title}" as unsettled?`;

    const doUnsettle = async () => {
      try {
        const { error } = await unsettleExpenseSplit(splitId);
        if (error) {
          Alert.alert("Error", error.message);
        } else {
          await loadBreakdown();
          onSettled();
        }
      } catch (error) {
        Alert.alert("Error", (error as Error).message);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        await doUnsettle();
      }
    } else {
      Alert.alert("Unsettle Split", message, [
        { text: "Cancel", style: "cancel" },
        { text: "Unsettle", onPress: doUnsettle },
      ]);
    }
  };

  const toggleExpanded = (splitId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(splitId)) {
        next.delete(splitId);
      } else {
        next.add(splitId);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getInitial = () => {
    if (breakdown?.otherUser.displayName) {
      return breakdown.otherUser.displayName.charAt(0).toUpperCase();
    }
    return balance?.displayName?.charAt(0).toUpperCase() || "?";
  };

  const formatSettledDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderExpenseItem = (
    item: BalanceBreakdownItem,
    isTheyOweYou: boolean
  ) => {
    const categoryInfo = getCategoryInfo(item.category);
    const isExpanded = expandedItems.has(item.splitId);
    const isSettled = item.settled;

    return (
      <TouchableOpacity
        key={item.splitId}
        style={[
          styles.expenseItem,
          { backgroundColor: colors.muted },
          isSettled && styles.expenseItemSettled,
        ]}
        onPress={() => toggleExpanded(item.splitId)}
        activeOpacity={0.7}
      >
        <View style={styles.expenseItemHeader}>
          <View style={styles.expenseItemHeaderLeft}>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: categoryInfo.bgColor },
                isSettled && { opacity: 0.6 },
              ]}
            >
              <Text
                style={[styles.categoryText, { color: categoryInfo.color }]}
              >
                {categoryInfo.label}
              </Text>
            </View>
            <Text
              style={[styles.expenseDate, { color: colors.mutedForeground }]}
            >
              {formatDate(item.date)}
            </Text>
            {isSettled && (
              <View style={styles.settledBadge}>
                <FontAwesome name="check" size={10} color="#16a34a" />
                <Text style={styles.settledBadgeText}>Settled</Text>
              </View>
            )}
          </View>
          <View style={styles.expenseItemHeaderRight}>
            {/* Receipt icon */}
            {item.receiptUrl && (
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={(e) => {
                  e.stopPropagation();
                  setReceiptToView({
                    url: item.receiptUrl!,
                    title: item.title,
                  });
                }}
              >
                <FontAwesome
                  name="file-image-o"
                  size={14}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
            {/* Edit icon - only for expenses the current user paid for */}
            {item.paidById === currentUserId && onEditExpense && (
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onEditExpense(item.expenseId);
                  onClose();
                }}
              >
                <FontAwesome
                  name="pencil"
                  size={14}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            )}
            <FontAwesome
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={12}
              color={colors.mutedForeground}
            />
          </View>
        </View>

        <View style={styles.expenseItemMain}>
          <Text
            style={[
              styles.expenseTitle,
              { color: isSettled ? colors.mutedForeground : colors.foreground },
              isSettled && styles.settledText,
            ]}
            numberOfLines={isExpanded ? undefined : 1}
          >
            {item.title}
          </Text>
          <Text
            style={[
              styles.expenseAmount,
              { color: isTheyOweYou ? "#16a34a" : "#dc2626" },
              isSettled && styles.settledText,
              isSettled && { opacity: 0.6 },
            ]}
          >
            {formatCurrency(item.splitAmount)}
          </Text>
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {item.description && (
              <Text
                style={[
                  styles.expenseDescription,
                  { color: colors.mutedForeground },
                ]}
              >
                {item.description}
              </Text>
            )}
            <View style={styles.expenseDetails}>
              <Text
                style={[styles.detailText, { color: colors.mutedForeground }]}
              >
                Paid by {item.paidByName}
              </Text>
              <Text
                style={[styles.detailText, { color: colors.mutedForeground }]}
              >
                Total: {formatCurrency(item.totalExpenseAmount)}
              </Text>
            </View>
            {isSettled && item.settledAt && (
              <View
                style={[
                  styles.settledInfo,
                  { backgroundColor: colors.background },
                ]}
              >
                <FontAwesome name="check-circle" size={14} color="#16a34a" />
                <Text
                  style={[
                    styles.settledInfoText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Settled {formatSettledDate(item.settledAt)}
                  {item.settledByName && ` by ${item.settledByName}`}
                </Text>
              </View>
            )}
            {/* Unsettle button - only for settled items where current user paid */}
            {isSettled && isTheyOweYou && (
              <TouchableOpacity
                style={[
                  styles.settleButton,
                  { backgroundColor: colors.muted, marginTop: 8 },
                ]}
                onPress={() =>
                  handleUnsettleSingleSplit(item.splitId, item.title)
                }
              >
                <FontAwesome name="undo" size={12} color={colors.mutedForeground} />
                <Text style={[styles.settleButtonText, { color: colors.mutedForeground }]}>
                  Mark Unpaid
                </Text>
              </TouchableOpacity>
            )}
            {/* Settle button - only shown in expanded content */}
            {!isSettled && isTheyOweYou && (
              <TouchableOpacity
                style={[
                  styles.settleButton,
                  { backgroundColor: "#16a34a", marginTop: 8 },
                ]}
                onPress={() =>
                  handleSettleSingleSplit(item.splitId, item.title)
                }
              >
                <FontAwesome name="check" size={12} color="#fff" />
                <Text style={styles.settleButtonText}>Mark This Paid</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!balance) return null;

  const theyOweYou = (breakdown?.netBalance ?? balance.netBalance) > 0;
  const youOweThem = (breakdown?.netBalance ?? balance.netBalance) < 0;
  const netAmount = Math.abs(breakdown?.netBalance ?? balance.netBalance);

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
            <FontAwesome
              name="chevron-left"
              size={20}
              color={colors.foreground}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Balance with{" "}
            {breakdown?.otherUser.displayName || balance.displayName || "User"}
          </Text>
          <View style={styles.closeButton} />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* User Avatar & Net Balance Summary */}
              <View style={styles.summarySection}>
                {(breakdown?.otherUser.avatarUrl || balance?.avatarUrl) ? (
                  <Image
                    source={{ uri: breakdown?.otherUser.avatarUrl || balance?.avatarUrl || "" }}
                    style={[styles.avatar, styles.avatarImage]}
                  />
                ) : (
                  <View
                    style={[styles.avatar, { backgroundColor: colors.primary }]}
                  >
                    <Text
                      style={[
                        styles.avatarText,
                        { color: colors.primaryForeground },
                      ]}
                    >
                      {getInitial()}
                    </Text>
                  </View>
                )}

                <View style={styles.netBalanceContainer}>
                  <Text
                    style={[styles.netLabel, { color: colors.mutedForeground }]}
                  >
                    {theyOweYou
                      ? "They owe you"
                      : youOweThem
                      ? "You owe them"
                      : "All settled"}
                  </Text>
                  <Text
                    style={[
                      styles.netAmount,
                      {
                        color: theyOweYou
                          ? "#16a34a"
                          : youOweThem
                          ? "#dc2626"
                          : colors.foreground,
                      },
                    ]}
                  >
                    {formatCurrency(netAmount)}
                  </Text>
                </View>
              </View>

              {/* They Owe You Section */}
              {breakdown && breakdown.theyOweYou.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                      <Text style={[styles.sectionTitle, { color: "#16a34a" }]}>
                        They Owe You
                      </Text>
                      {breakdown.theyOweYou.some((item) => item.settled) && (
                        <Text
                          style={[
                            styles.sectionCount,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          (
                          {
                            breakdown.theyOweYou.filter((item) => !item.settled)
                              .length
                          }{" "}
                          unsettled)
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.sectionTotal, { color: "#16a34a" }]}>
                      {formatCurrency(breakdown.totalTheyOwe)}
                    </Text>
                  </View>
                  <View style={styles.expensesList}>
                    {breakdown.theyOweYou.map((item) =>
                      renderExpenseItem(item, true)
                    )}
                  </View>
                </View>
              )}

              {/* You Owe Them Section */}
              {breakdown && breakdown.youOweThem.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                      <Text style={[styles.sectionTitle, { color: "#dc2626" }]}>
                        You Owe Them
                      </Text>
                      {breakdown.youOweThem.some((item) => item.settled) && (
                        <Text
                          style={[
                            styles.sectionCount,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          (
                          {
                            breakdown.youOweThem.filter((item) => !item.settled)
                              .length
                          }{" "}
                          unsettled)
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.sectionTotal, { color: "#dc2626" }]}>
                      {formatCurrency(breakdown.totalYouOwe)}
                    </Text>
                  </View>
                  <View style={styles.expensesList}>
                    {breakdown.youOweThem.map((item) =>
                      renderExpenseItem(item, false)
                    )}
                  </View>
                </View>
              )}

              {/* Empty state - only show if NO expenses at all */}
              {breakdown &&
                breakdown.theyOweYou.length === 0 &&
                breakdown.youOweThem.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <FontAwesome
                      name="check-circle"
                      size={48}
                      color="#16a34a"
                    />
                    <Text
                      style={[styles.emptyText, { color: colors.foreground }]}
                    >
                      All settled up!
                    </Text>
                  </View>
                )}

              {/* Bottom padding */}
              <View style={{ height: 24 }} />
            </ScrollView>

            {/* Footer Actions - only show if there are unsettled items */}
            {breakdown &&
              (breakdown.theyOweYou.some((item) => !item.settled) ||
                breakdown.youOweThem.some((item) => !item.settled)) && (
                <View
                  style={[styles.footer, { borderTopColor: colors.border }]}
                >
                  {youOweThem &&
                    (breakdown.otherUser.venmoHandle ||
                      balance.venmoHandle) && (
                      <TouchableOpacity
                        style={styles.footerVenmoButton}
                        onPress={handlePayViaVenmo}
                      >
                        <FontAwesome name="dollar" size={16} color="#fff" />
                        <Text style={styles.footerButtonText}>
                          Pay {formatCurrency(netAmount)} via Venmo
                        </Text>
                      </TouchableOpacity>
                    )}
                  {youOweThem &&
                    !breakdown.otherUser.venmoHandle &&
                    !balance.venmoHandle && (
                      <View
                        style={[
                          styles.noVenmoContainer,
                          { backgroundColor: colors.muted },
                        ]}
                      >
                        <FontAwesome
                          name="info-circle"
                          size={14}
                          color={colors.mutedForeground}
                        />
                        <Text
                          style={[
                            styles.noVenmoText,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {breakdown.otherUser.displayName || "This user"}{" "}
                          hasn't set up Venmo
                        </Text>
                      </View>
                    )}
                  <TouchableOpacity
                    style={[
                      styles.settleAllButton,
                      {
                        backgroundColor: theyOweYou
                          ? "#16a34a"
                          : colors.primary,
                      },
                    ]}
                    onPress={handleSettleUp}
                    disabled={isSettling}
                  >
                    <FontAwesome name="check" size={16} color="#fff" />
                    <Text style={styles.footerButtonText}>
                      {isSettling ? "Settling..." : "Mark All as Settled"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
          </>
        )}
      </View>

      {/* Receipt Viewer */}
      {receiptToView && (
        <ReceiptViewer
          visible={!!receiptToView}
          onClose={() => setReceiptToView(null)}
          receiptUrl={receiptToView.url}
          expenseTitle={receiptToView.title}
        />
      )}
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
  headerTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
    flex: 1,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summarySection: {
    alignItems: "center",
    paddingVertical: 24,
    marginBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarImage: {
    resizeMode: "cover",
  },
  avatarText: {
    fontSize: 28,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  netBalanceContainer: {
    alignItems: "center",
  },
  netLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    marginBottom: 4,
  },
  netAmount: {
    fontSize: 36,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  sectionCount: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
  sectionTotal: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  expensesList: {
    gap: 8,
  },
  expenseItem: {
    borderRadius: 10,
    padding: 12,
  },
  expenseItemSettled: {
    opacity: 0.7,
  },
  settledBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
    marginRight: 4,
  },
  settledBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillaxMedium,
    color: "#16a34a",
  },
  settledText: {
    textDecorationLine: "line-through",
  },
  settledInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 6,
    gap: 8,
    marginTop: 8,
  },
  settledInfoText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    flex: 1,
  },
  expenseItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  expenseItemHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  expenseItemHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerIconButton: {
    padding: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  expenseDate: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    flex: 1,
  },
  expenseItemMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expenseTitle: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
    flex: 1,
    marginRight: 12,
  },
  expenseAmount: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  expenseDescription: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    marginBottom: 8,
  },
  expenseDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
  settleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  settleButtonText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  footerVenmoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  noVenmoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  noVenmoText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  footerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  settleAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
});
