import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import type { ExpenseWithDetails } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { ExpenseCard } from "./ExpenseCard";

interface ExpenseListProps {
  expenses: ExpenseWithDetails[];
  currentUserId: string;
  onEditExpense?: (expense: ExpenseWithDetails) => void;
  onDeleteExpense?: (expense: ExpenseWithDetails) => void;
  onSettleSplit?: (splitId: string) => void;
  onUnsettleSplit?: (splitId: string) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function ExpenseList({
  expenses,
  currentUserId,
  onEditExpense,
  onDeleteExpense,
  onSettleSplit,
  onUnsettleSplit,
  refreshing,
  onRefresh,
}: ExpenseListProps) {
  const colors = useColors();

  if (expenses.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="credit-card" size={48} color={colors.foreground} />
        <Text style={[styles.emptyText, { color: colors.foreground }]}>
          No expenses yet
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.foreground }]}>
          Add an expense to start tracking
        </Text>
      </View>
    );
  }

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
      {expenses.map((expense) => (
        <ExpenseCard
          key={expense.id}
          expense={expense}
          currentUserId={currentUserId}
          onEdit={onEditExpense}
          onDelete={onDeleteExpense}
          onSettleSplit={onSettleSplit}
          onUnsettleSplit={onUnsettleSplit}
        />
      ))}
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
});
