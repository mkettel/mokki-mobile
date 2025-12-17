import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Preset accent colors
export const ACCENT_COLORS = [
  { name: "Mountain Blue", hex: "#4f68c0" }, // Default
  { name: "Ocean Teal", hex: "#0d9488" },
  { name: "Sunset Orange", hex: "#ea580c" },
  { name: "Forest Green", hex: "#16a34a" },
  { name: "Berry Purple", hex: "#9333ea" },
  { name: "Rose Pink", hex: "#e11d48" },
  { name: "Slate Gray", hex: "#475569" },
  { name: "Amber Gold", hex: "#d97706" },
];

interface ColorPickerProps {
  selectedColor: string | undefined;
  onColorSelect: (color: string | undefined) => void;
}

export function ColorPicker({ selectedColor, onColorSelect }: ColorPickerProps) {
  const colors = useColors();

  // Normalize colors for comparison (lowercase, no spaces)
  const normalizeColor = (color: string | undefined) =>
    color?.toLowerCase().trim();

  const isSelected = (hex: string) =>
    normalizeColor(selectedColor) === normalizeColor(hex);

  const isDefaultSelected =
    !selectedColor || isSelected(ACCENT_COLORS[0].hex);

  return (
    <View style={styles.container}>
      <View style={styles.colorGrid}>
        {ACCENT_COLORS.map((color, index) => (
          <TouchableOpacity
            key={color.hex}
            style={[
              styles.colorButton,
              { backgroundColor: color.hex },
              isSelected(color.hex) && styles.colorButtonSelected,
              isSelected(color.hex) && { borderColor: colors.foreground },
            ]}
            onPress={() =>
              onColorSelect(index === 0 ? undefined : color.hex)
            }
            activeOpacity={0.7}
          >
            {isSelected(color.hex) && (
              <FontAwesome
                name="check"
                size={16}
                color="#ffffff"
                style={styles.checkIcon}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Show selected color name */}
      <Text style={[styles.colorName, { color: colors.mutedForeground }]}>
        {isDefaultSelected
          ? `${ACCENT_COLORS[0].name} (Default)`
          : ACCENT_COLORS.find((c) => isSelected(c.hex))?.name ||
            "Custom Color"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  colorButtonSelected: {
    borderWidth: 3,
  },
  checkIcon: {
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  colorName: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
});
