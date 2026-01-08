import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HouseSwitcher } from "./HouseSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function TopBar() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          backgroundColor: colors.background + "E6", // 90% opacity for blur effect
        },
      ]}
    >
      {/* Top row: Snow toggle and Theme switcher on right */}
      <View style={styles.topRow}>
        <View style={styles.spacer} />
        <View style={styles.topRowRight}>
          <ThemeSwitcher />
        </View>
      </View>

      {/* Bottom row: MÖKKI | House Name */}
      <View style={styles.bottomRow}>
        <View style={styles.brandContainer}>
          <Text style={[styles.brand, { color: colors.foreground }]}>
            MÖKKI
          </Text>
          <Text style={[styles.separator, { color: colors.mutedForeground }]}>
            |
          </Text>
          <HouseSwitcher />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  spacer: {
    flex: 1,
  },
  topRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  brand: {
    fontSize: 20,
    fontFamily: typography.fontFamily.chillaxBold,
    letterSpacing: 1,
  },
  separator: {
    fontSize: 20,
    marginHorizontal: 10,
  },
});
