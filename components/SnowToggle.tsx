import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useColors } from "@/lib/context/theme";

interface SnowToggleProps {
  enabled?: boolean;
  onToggle?: () => void;
}

export function SnowToggle({ enabled = false, onToggle }: SnowToggleProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      onPress={onToggle}
      style={styles.button}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <FontAwesome
        name="snowflake-o"
        size={18}
        color={enabled ? "#60A5FA" : colors.mutedForeground}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
  },
});
