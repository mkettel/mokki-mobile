import { borderRadius, typography } from "@/constants/theme";
import { useColors, useTheme } from "@/lib/context/theme";
import Fontisto from "@expo/vector-icons/Fontisto";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type ThemeOption = "light" | "dark" | "system";

const themeOptions: { value: ThemeOption; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "day-sunny" },
  { value: "dark", label: "Dark", icon: "night-clear" },
  { value: "system", label: "System", icon: "laptop" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const colors = useColors();
  const [isOpen, setIsOpen] = useState(false);

  const currentIcon =
    theme === "dark"
      ? "night-clear"
      : theme === "light"
      ? "day-sunny"
      : "laptop";

  const handleSelect = (value: ThemeOption) => {
    setTheme(value);
    setIsOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        style={styles.button}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Fontisto
          name={currentIcon as any}
          size={18}
          color={colors.foreground}
        />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <View
            style={[
              styles.dropdown,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.dropdownTitle,
                {
                  color: colors.foreground,
                },
              ]}
            >
              Theme
            </Text>
            {themeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  theme === option.value && {
                    backgroundColor: colors.accent,
                  },
                ]}
                onPress={() => handleSelect(option.value)}
              >
                <Fontisto
                  name={option.icon as any}
                  size={16}
                  color={colors.foreground}
                  style={styles.optionIcon}
                />
                <Text style={[styles.optionText, { color: colors.foreground }]}>
                  {option.label}
                </Text>
                {theme === option.value && (
                  <Fontisto
                    name="check"
                    size={14}
                    color={colors.foreground}
                    style={styles.checkIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdown: {
    width: 200,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: 8,
  },
  dropdownTitle: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  optionIcon: {
    width: 24,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  checkIcon: {
    marginLeft: 8,
  },
});
