import { typography } from "@/constants/theme";
import { formatCurrency } from "@/lib/api/expenses";
import { useColors } from "@/lib/context/theme";
import type { ExpenseSummary } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ExpenseSummaryCardsProps {
  summary: ExpenseSummary;
}

export function ExpenseSummaryCards({ summary }: ExpenseSummaryCardsProps) {
  const colors = useColors();

  type IconName = React.ComponentProps<typeof FontAwesome>["name"];

  const cards: {
    label: string;
    amount: number;
    color: string;
    bgColor: string;
    icon: IconName;
    prefix?: string;
  }[] = [
    {
      label: "You Owe",
      amount: summary.totalYouOwe,
      color: "#dc2626", // red
      bgColor: "#fef2f2",
      icon: "arrow-up",
    },
    {
      label: "You're Owed",
      amount: summary.totalYouAreOwed,
      color: "#16a34a", // green
      bgColor: "#f0fdf4",
      icon: "arrow-down",
    },
    {
      label: "Net Balance",
      amount: Math.abs(summary.netBalance),
      color: summary.netBalance >= 0 ? "#16a34a" : "#dc2626",
      bgColor: summary.netBalance >= 0 ? "#f0fdf4" : "#fef2f2",
      icon: summary.netBalance >= 0 ? "plus" : "minus",
      prefix: summary.netBalance >= 0 ? "+" : "-",
    },
  ];

  return (
    <View style={styles.container}>
      {cards.map((card, index) => (
        <View
          key={card.label}
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderLeftColor: card.color,
            },
          ]}
        >
          <View
            style={[styles.iconContainer, { backgroundColor: card.bgColor }]}
          >
            <FontAwesome name={card.icon} size={14} color={card.color} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              {card.label}
            </Text>
            <Text style={[styles.amount, { color: card.color }]}>
              {card.prefix || ""}
              {formatCurrency(card.amount)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    gap: 25,
    paddingHorizontal: 4,
  },
  card: {
    flex: 1,
    borderRadius: 0,
    padding: 12,
    borderLeftWidth: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillax,
    marginBottom: 2,
  },
  amount: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
});
