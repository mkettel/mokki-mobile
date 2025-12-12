import { typography } from "@/constants/theme";
import { formatCurrency } from "@/lib/api/expenses";
import { useColors } from "@/lib/context/theme";
import type { ExpenseSummary } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ExpenseSummaryCardsProps {
  summary: ExpenseSummary;
}

export function ExpenseSummaryCards({ summary }: ExpenseSummaryCardsProps) {
  const colors = useColors();

  type IconName = React.ComponentProps<typeof FontAwesome>["name"];
  type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

  const cards: {
    label: string;
    amount: number;
    color: string;
    bgColor: string;
    icon: FeatherIconName;
    prefix?: string;
  }[] = [
    {
      label: "You Owe",
      amount: summary.totalYouOwe,
      color: "#dc2626", // red
      bgColor: "#fef2f2",
      icon: "arrow-up-right",
    },
    {
      label: "You're Owed",
      amount: summary.totalYouAreOwed,
      color: "#16a34a", // green
      bgColor: "#f0fdf4",
      icon: "arrow-down-left",
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
            <Feather name={card.icon} size={14} color={card.color} />
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
    gap: 10,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 0,
    padding: 10,
    paddingLeft: 0,
    borderLeftWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 50,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    marginLeft: 4,
  },
  label: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    marginBottom: 2,
  },
  amount: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
});
