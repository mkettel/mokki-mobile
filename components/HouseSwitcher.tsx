import { borderRadius, typography } from "@/constants/theme";
import { HouseWithRole } from "@/lib/api/house";
import { useHouse } from "@/lib/context/house";
import { useColors } from "@/lib/context/theme";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Get font size based on house name length
function getHouseNameFontSize(name: string): number {
  const length = name.length;
  if (length <= 9) return 16; // Short names: full size
  if (length <= 12) return 14; // Medium names: slightly smaller
  if (length <= 16) return 12; // Long names: smaller
  return 11; // Very long names: smallest
}

export function HouseSwitcher() {
  const { activeHouse, houses, setActiveHouse } = useHouse();
  const colors = useColors();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const houseNameFontSize = activeHouse
    ? getHouseNameFontSize(activeHouse.name)
    : 16;

  const handleSelectHouse = async (house: HouseWithRole) => {
    await setActiveHouse(house);
    setIsOpen(false);
  };

  const handleCreateHouse = () => {
    setIsOpen(false);
    router.push("/create-house");
  };

  if (!activeHouse) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        style={styles.trigger}
        hitSlop={{ top: 10, bottom: 10, left: 5, right: 10 }}
      >
        <Text
          style={[
            styles.houseName,
            { color: colors.foreground, fontSize: houseNameFontSize },
          ]}
          numberOfLines={1}
        >
          {activeHouse.name}
        </Text>
        <FontAwesome
          name="chevron-down"
          size={12}
          color={colors.foreground}
          style={styles.chevron}
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
              style={[styles.dropdownTitle, { color: colors.mutedForeground }]}
            >
              Switch House
            </Text>

            <ScrollView style={styles.houseList}>
              {houses.map((house) => (
                <TouchableOpacity
                  key={house.id}
                  style={[
                    styles.houseOption,
                    activeHouse.id === house.id && {
                      backgroundColor: colors.accent,
                    },
                  ]}
                  onPress={() => handleSelectHouse(house)}
                >
                  <View style={styles.houseInfo}>
                    <Text
                      style={[
                        styles.houseOptionName,
                        { color: colors.foreground },
                      ]}
                      numberOfLines={1}
                    >
                      {house.name}
                    </Text>
                    <Text
                      style={[
                        styles.houseRole,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {house.role}
                    </Text>
                  </View>
                  {activeHouse.id === house.id && (
                    <FontAwesome
                      name="check"
                      size={14}
                      color={colors.foreground}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />

            <TouchableOpacity
              style={styles.createOption}
              onPress={handleCreateHouse}
            >
              <FontAwesome
                name="plus"
                size={14}
                color={colors.foreground}
                style={styles.createIcon}
              />
              <Text style={[styles.createText, { color: colors.foreground }]}>
                Create New House
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 180,
  },
  houseName: {
    fontFamily: typography.fontFamily.chillaxMedium,
    flexShrink: 1,
  },
  chevron: {
    marginLeft: 6,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdown: {
    width: 280,
    maxHeight: 400,
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
  houseList: {
    maxHeight: 250,
  },
  houseOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
  },
  houseInfo: {
    flex: 1,
    marginRight: 8,
  },
  houseOptionName: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  houseRole: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    textTransform: "capitalize",
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  createOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  createIcon: {
    marginRight: 10,
  },
  createText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
});
