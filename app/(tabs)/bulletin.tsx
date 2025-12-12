import { BulletinGrid, HouseNoteCard, NoteModal } from "@/components/bulletin";
import { PageContainer } from "@/components/PageContainer";
import { TopBar } from "@/components/TopBar";
import { typography } from "@/constants/theme";
import {
  createBulletinItem,
  deleteBulletinItem,
  getBulletinItems,
  getHouseNote,
  updateBulletinItem,
  updateHouseNote,
} from "@/lib/api/bulletin";
import { useAuth } from "@/lib/context/auth";
import { useHouse } from "@/lib/context/house";
import { useColors } from "@/lib/context/theme";
import type {
  BulletinCategory,
  BulletinItemWithProfile,
  BulletinStyle,
  HouseNoteWithEditor,
} from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type TabType = "notes" | "house-note";

export default function BulletinScreen() {
  const colors = useColors();
  const { activeHouse } = useHouse();
  const { user } = useAuth();

  // Data state
  const [bulletinItems, setBulletinItems] = useState<BulletinItemWithProfile[]>(
    []
  );
  const [houseNote, setHouseNote] = useState<HouseNoteWithEditor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>("notes");
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingItem, setEditingItem] =
    useState<BulletinItemWithProfile | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!activeHouse) return;

    try {
      const [itemsResult, noteResult] = await Promise.all([
        getBulletinItems(activeHouse.id),
        getHouseNote(activeHouse.id),
      ]);

      if (itemsResult.error) {
        console.error("Error fetching bulletin items:", itemsResult.error);
      } else {
        setBulletinItems(itemsResult.items);
      }

      if (noteResult.error) {
        console.error("Error fetching house note:", noteResult.error);
      } else {
        setHouseNote(noteResult.note);
      }
    } catch (error) {
      console.error("Error fetching bulletin data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeHouse]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Bulletin item actions
  const handleAddItem = async (data: {
    title: string;
    content: string;
    category: BulletinCategory | null;
    color: string;
    style: BulletinStyle;
  }) => {
    if (!activeHouse || !user) return;

    const { error } = await createBulletinItem(activeHouse.id, user.id, data);

    if (error) {
      throw error;
    }

    fetchData();
  };

  const handleEditItem = async (data: {
    title: string;
    content: string;
    category: BulletinCategory | null;
    color: string;
    style: BulletinStyle;
  }) => {
    if (!editingItem) return;

    const { error } = await updateBulletinItem(editingItem.id, data);

    if (error) {
      throw error;
    }

    fetchData();
  };

  const handleDeleteItem = (item: BulletinItemWithProfile) => {
    const message = `Delete "${item.title}"? This cannot be undone.`;

    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        deleteBulletinItem(item.id).then(({ error }) => {
          if (error) {
            window.alert("Error: " + error.message);
          } else {
            fetchData();
          }
        });
      }
    } else {
      Alert.alert("Delete Note", message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteBulletinItem(item.id);
            if (error) {
              Alert.alert("Error", error.message);
            } else {
              fetchData();
            }
          },
        },
      ]);
    }
  };

  const openEditModal = (item: BulletinItemWithProfile) => {
    setEditingItem(item);
    setShowNoteModal(true);
  };

  // House note actions
  const handleSaveHouseNote = async (content: string) => {
    if (!activeHouse || !user) return;

    const { error } = await updateHouseNote(activeHouse.id, user.id, content);

    if (error) {
      throw error;
    }

    fetchData();
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <TopBar />
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  return (
    <PageContainer>
      <TopBar />

      {/* Header with action button */}
      <View style={styles.header}>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Bulletin board
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            setEditingItem(null);
            setShowNoteModal(true);
          }}
        >
          <FontAwesome name="plus" size={16} color={colors.primaryForeground} />
          <Text
            style={[styles.addButtonText, { color: colors.primaryForeground }]}
          >
            Add
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab switcher */}
      <View style={[styles.tabContainer, { backgroundColor: colors.muted }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "notes" && { backgroundColor: colors.background },
          ]}
          onPress={() => setActiveTab("notes")}
        >
          <FontAwesome
            name="thumb-tack"
            size={14}
            color={
              activeTab === "notes" ? colors.foreground : colors.mutedForeground
            }
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "notes"
                    ? colors.foreground
                    : colors.mutedForeground,
              },
            ]}
          >
            Notes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "house-note" && {
              backgroundColor: colors.background,
            },
          ]}
          onPress={() => setActiveTab("house-note")}
        >
          <FontAwesome
            name="sticky-note-o"
            size={14}
            color={
              activeTab === "house-note"
                ? colors.foreground
                : colors.mutedForeground
            }
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "house-note"
                    ? colors.foreground
                    : colors.mutedForeground,
              },
            ]}
          >
            Fridge Note
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === "notes" ? (
          <BulletinGrid
            items={bulletinItems}
            onEditItem={openEditModal}
            onDeleteItem={handleDeleteItem}
          />
        ) : (
          <HouseNoteCard note={houseNote} onSave={handleSaveHouseNote} />
        )}
      </View>

      {/* Note Modal */}
      <NoteModal
        visible={showNoteModal}
        item={editingItem}
        onClose={() => {
          setShowNoteModal(false);
          setEditingItem(null);
        }}
        onSubmit={editingItem ? handleEditItem : handleAddItem}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillax,
    maxWidth: "70%",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 12,
    padding: 4,
    borderRadius: 10,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
