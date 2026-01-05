import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useColors } from "@/lib/context/theme";
import { typography } from "@/constants/theme";
import { formatCurrency, getCategoryInfo } from "@/lib/api/expenses";
import type { ExpenseWithDetails } from "@/types/database";
import { ReceiptViewer } from "./ReceiptViewer";

interface ExpenseCardProps {
  expense: ExpenseWithDetails;
  currentUserId: string;
  onEdit?: (expense: ExpenseWithDetails) => void;
  onDelete?: (expense: ExpenseWithDetails) => void;
  onSettleSplit?: (splitId: string) => void;
  onUnsettleSplit?: (splitId: string) => void;
}

export function ExpenseCard({
  expense,
  currentUserId,
  onEdit,
  onDelete,
  onSettleSplit,
  onUnsettleSplit,
}: ExpenseCardProps) {
  const colors = useColors();
  const [showSplits, setShowSplits] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const categoryInfo = getCategoryInfo(expense.category);
  const isPayer = expense.paid_by === currentUserId;
  const isCreator = expense.created_by === currentUserId;

  // Find user's split if they're not the payer
  const userSplit = expense.expense_splits?.find(
    (s) => s.user_id === currentUserId
  );

  // Count splits for progress indicator
  const totalSplits = expense.expense_splits?.length || 0;
  const settledCount = expense.expense_splits?.filter((s) => s.settled).length || 0;
  const unsettledCount = totalSplits - settledCount;

  // Check if expense is fully settled (all splits paid)
  const isFullySettled = totalSplits > 0 && settledCount === totalSplits;

  const getPayerName = () => {
    const profile = expense.paid_by_profile;
    if (!profile) return "Unknown";
    return profile.display_name || profile.email.split("@")[0];
  };

  const getPayerInitial = () => {
    const name = getPayerName();
    return name.charAt(0).toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getSplitUserName = (split: ExpenseWithDetails["expense_splits"][0]) => {
    const profile = split.profiles;
    return profile?.display_name || profile?.email.split("@")[0] || "Unknown";
  };

  const getSplitUserInitial = (split: ExpenseWithDetails["expense_splits"][0]) => {
    const name = getSplitUserName(split);
    return name.charAt(0).toUpperCase();
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Category badge */}
          <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.bgColor }]}>
            <Text style={[styles.categoryText, { color: categoryInfo.color }]}>
              {categoryInfo.label}
            </Text>
          </View>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {formatDate(expense.date)}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {/* Receipt button */}
          {expense.receipt_url && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowReceipt(true)}
            >
              <FontAwesome name="file-image-o" size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
          {isCreator && (
            <>
              {onEdit && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onEdit(expense)}
                >
                  <FontAwesome name="pencil" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onDelete(expense)}
                >
                  <FontAwesome name="trash-o" size={14} color={colors.destructive} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>

      {/* Title and amount */}
      <View style={styles.mainRow}>
        <View style={styles.titleContainer}>
          <Text
            style={[
              styles.title,
              { color: isFullySettled ? colors.mutedForeground : colors.foreground },
              isFullySettled && styles.settledTitle,
            ]}
            numberOfLines={1}
          >
            {expense.title || expense.description}
          </Text>
          {expense.description && expense.title && (
            <Text
              style={[styles.description, { color: colors.mutedForeground }]}
              numberOfLines={2}
            >
              {expense.description}
            </Text>
          )}
        </View>
        <Text style={[styles.amount, { color: colors.foreground }]}>
          {formatCurrency(expense.amount)}
        </Text>
      </View>

      {/* Payer info */}
      <View style={styles.payerRow}>
        <View style={[styles.payerAvatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.payerAvatarText, { color: colors.primaryForeground }]}>{getPayerInitial()}</Text>
        </View>
        <Text style={[styles.payerText, { color: colors.mutedForeground }]}>
          Paid to {isPayer ? "you" : getPayerName()}
        </Text>
        {expense.paid_by_profile?.venmo_handle && (
          <View style={[styles.venmoTag, { backgroundColor: colors.muted }]}>
            <FontAwesome name="dollar" size={10} color={colors.mutedForeground} />
            <Text style={[styles.venmoText, { color: colors.mutedForeground }]}>
              {expense.paid_by_profile.venmo_handle}
            </Text>
          </View>
        )}
      </View>

      {/* User's share (if not payer) */}
      {!isPayer && userSplit && (
        <View style={[styles.shareRow, { backgroundColor: colors.muted }]}>
          <Text style={[styles.shareLabel, { color: colors.mutedForeground }]}>
            Your share:
          </Text>
          <Text
            style={[
              styles.shareAmount,
              { color: userSplit.settled ? colors.mutedForeground : "#dc2626" },
            ]}
          >
            {formatCurrency(userSplit.amount)}
            {userSplit.settled && " (Paid)"}
          </Text>
        </View>
      )}

      {/* Settlement progress indicator */}
      {totalSplits > 0 && (
        <View
          style={[
            styles.progressRow,
            {
              backgroundColor: isFullySettled
                ? "#dcfce7"
                : unsettledCount > 0
                ? "#fef3c7"
                : colors.muted,
            },
          ]}
        >
          <FontAwesome
            name={isFullySettled ? "check-circle" : "clock-o"}
            size={12}
            color={isFullySettled ? "#166534" : "#92400e"}
          />
          <Text
            style={[
              styles.progressText,
              { color: isFullySettled ? "#166534" : "#92400e" },
            ]}
          >
            {isFullySettled
              ? "All paid"
              : `${settledCount}/${totalSplits} paid`}
          </Text>
        </View>
      )}

      {/* Expandable splits section */}
      {expense.expense_splits && expense.expense_splits.length > 0 && (
        <>
          <TouchableOpacity
            style={[styles.splitsToggle, { borderTopColor: colors.border }]}
            onPress={() => setShowSplits(!showSplits)}
          >
            <Text style={[styles.splitsToggleText, { color: colors.mutedForeground }]}>
              {showSplits ? "Hide" : "Show"} splits ({expense.expense_splits.length})
            </Text>
            <FontAwesome
              name={showSplits ? "chevron-up" : "chevron-down"}
              size={12}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>

          {showSplits && (
            <View style={styles.splitsContainer}>
              {expense.expense_splits.map((split) => (
                <View key={split.id} style={styles.splitRow}>
                  <View style={styles.splitLeft}>
                    <View style={[styles.splitAvatar, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.splitAvatarText, { color: colors.foreground }]}>
                        {getSplitUserInitial(split)}
                      </Text>
                    </View>
                    <Text style={[styles.splitName, { color: colors.foreground }]}>
                      {getSplitUserName(split)}
                    </Text>
                  </View>
                  <View style={styles.splitRight}>
                    <Text
                      style={[
                        styles.splitAmount,
                        { color: split.settled ? colors.mutedForeground : colors.foreground },
                      ]}
                    >
                      {formatCurrency(split.amount)}
                    </Text>
                    {isPayer && (
                      <TouchableOpacity
                        style={[
                          styles.settleButton,
                          {
                            backgroundColor: split.settled ? colors.muted : "#16a34a",
                          },
                        ]}
                        onPress={() =>
                          split.settled
                            ? onUnsettleSplit?.(split.id)
                            : onSettleSplit?.(split.id)
                        }
                      >
                        <FontAwesome
                          name={split.settled ? "undo" : "check"}
                          size={10}
                          color={split.settled ? colors.mutedForeground : "#fff"}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Receipt Viewer Modal */}
      {expense.receipt_url && (
        <ReceiptViewer
          visible={showReceipt}
          onClose={() => setShowReceipt(false)}
          receiptUrl={expense.receipt_url}
          expenseTitle={expense.title || expense.description}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  date: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  mainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  settledTitle: {
    textDecorationLine: "line-through",
  },
  description: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 4,
  },
  amount: {
    fontSize: 20,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  payerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  payerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  payerAvatarText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  payerText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    flex: 1,
  },
  venmoTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  venmoText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
  },
  shareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
  },
  shareLabel: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  shareAmount: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  progressText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  splitsToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  splitsToggleText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  splitsContainer: {
    marginTop: 12,
    gap: 8,
  },
  splitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  splitLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  splitAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  splitAvatarText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  splitName: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  splitRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  splitAmount: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  settleButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
