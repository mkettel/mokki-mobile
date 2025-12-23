import { borderRadius, typography } from "@/constants/theme";
import { HouseWithRole } from "@/lib/api/house";
import { useHouse } from "@/lib/context/house";
import { useColors } from "@/lib/context/theme";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import React, { useState, useMemo } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
  const { activeHouse, houses, setActiveHouse, archiveHouse } = useHouse();
  const colors = useColors();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const houseNameFontSize = activeHouse
    ? getHouseNameFontSize(activeHouse.name)
    : 16;

  // Separate houses into active and archived
  const { activeHouses, archivedHouses } = useMemo(() => {
    const active: HouseWithRole[] = [];
    const archived: HouseWithRole[] = [];

    houses.forEach((house) => {
      if (house.isArchived) {
        archived.push(house);
      } else {
        active.push(house);
      }
    });

    return { activeHouses: active, archivedHouses: archived };
  }, [houses]);

  // Houses to display based on toggle
  const displayedHouses = showArchived
    ? [...activeHouses, ...archivedHouses]
    : activeHouses;

  const handleSelectHouse = async (house: HouseWithRole) => {
    await setActiveHouse(house);
    setIsOpen(false);
  };

  const handleCreateHouse = () => {
    setIsOpen(false);
    router.push("/create-house");
  };

  const handleArchiveToggle = async (house: HouseWithRole) => {
    const action = house.isArchived ? "unarchive" : "archive";
    const message = `${action === "archive" ? "Archive" : "Unarchive"} "${house.name}"?`;

    const doArchive = async () => {
      try {
        await archiveHouse(house.id, !house.isArchived);
      } catch (error) {
        const errorMessage = `Failed to ${action} house`;
        if (Platform.OS === "web") {
          window.alert(errorMessage);
        } else {
          Alert.alert("Error", errorMessage);
        }
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        doArchive();
      }
    } else {
      Alert.alert(
        house.isArchived ? "Unarchive House" : "Archive House",
        message,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: house.isArchived ? "Unarchive" : "Archive",
            onPress: doArchive,
            style: house.isArchived ? "default" : "destructive",
          },
        ]
      );
    }
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
              {displayedHouses.map((house) => (
                <TouchableOpacity
                  key={house.id}
                  style={[
                    styles.houseOption,
                    activeHouse.id === house.id && {
                      backgroundColor: colors.accent,
                    },
                    house.isArchived && styles.archivedHouse,
                  ]}
                  onPress={() => handleSelectHouse(house)}
                  onLongPress={() => handleArchiveToggle(house)}
                  delayLongPress={500}
                >
                  <View style={styles.houseInfo}>
                    <View style={styles.houseNameRow}>
                      <Text
                        style={[
                          styles.houseOptionName,
                          {
                            color: house.isArchived
                              ? colors.mutedForeground
                              : colors.foreground,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {house.name}
                      </Text>
                      {house.isArchived && (
                        <View
                          style={[
                            styles.archivedBadge,
                            { backgroundColor: colors.muted },
                          ]}
                        >
                          <Text
                            style={[
                              styles.archivedBadgeText,
                              { color: colors.mutedForeground },
                            ]}
                          >
                            Archived
                          </Text>
                        </View>
                      )}
                    </View>
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

            {/* Show Archived Toggle - only show if there are archived houses */}
            {archivedHouses.length > 0 && (
              <>
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
                <View style={styles.toggleRow}>
                  <Text
                    style={[styles.toggleLabel, { color: colors.mutedForeground }]}
                  >
                    Show Archived ({archivedHouses.length})
                  </Text>
                  <Switch
                    value={showArchived}
                    onValueChange={setShowArchived}
                    trackColor={{ false: colors.muted, true: colors.accent }}
                    thumbColor={colors.background}
                  />
                </View>
              </>
            )}

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

            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              Long-press a house to archive
            </Text>
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
  houseNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  houseOptionName: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    flexShrink: 1,
  },
  archivedHouse: {
    opacity: 0.7,
  },
  archivedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  archivedBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillaxMedium,
    textTransform: "uppercase",
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
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  hintText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
    paddingVertical: 8,
    fontStyle: "italic",
  },
});
