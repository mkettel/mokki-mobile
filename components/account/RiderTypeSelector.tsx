import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import type { RiderType } from "@/types/database";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface RiderTypeSelectorProps {
  value: RiderType | null;
  onChange: (value: RiderType | null) => void;
  disabled?: boolean;
}

type RiderOption = {
  value: RiderType;
  label: string;
  emoji: string;
};

const RIDER_OPTIONS: RiderOption[] = [
  { value: "skier", label: "Skier", emoji: "\u26F7\uFE0F" },
  { value: "snowboarder", label: "Snowboarder", emoji: "\uD83C\uDFC2" },
  { value: "both", label: "Both", emoji: "\u26F7\uFE0F\uD83C\uDFC2" },
];

export function RiderTypeSelector({
  value,
  onChange,
  disabled = false,
}: RiderTypeSelectorProps) {
  const colors = useColors();

  const handlePress = (optionValue: RiderType) => {
    // Toggle off if already selected
    onChange(value === optionValue ? null : optionValue);
  };

  return (
    <View style={styles.container}>
      {RIDER_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              {
                backgroundColor: isSelected ? colors.primary : colors.card,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
            onPress={() => handlePress(option.value)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{option.emoji}</Text>
            <Text
              style={[
                styles.label,
                { color: isSelected ? "#fff" : colors.foreground },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 10,
  },
  option: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
});
