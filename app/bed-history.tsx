import React from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useHouse } from "@/lib/context/house";
import { useColors } from "@/lib/context/theme";
import { BedHistoryLog } from "@/components/beds";

export default function BedHistoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const { activeHouse } = useHouse();

  if (!activeHouse) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BedHistoryLog
        houseId={activeHouse.id}
        onClose={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
