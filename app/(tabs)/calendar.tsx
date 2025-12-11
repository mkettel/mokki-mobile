import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { useColors } from "@/lib/context/theme";
import { useHouse } from "@/lib/context/house";
import { useAuth } from "@/lib/context/auth";
import { typography } from "@/constants/theme";
import {
  getHouseStays,
  getHouseEvents,
  createStay,
  updateStay,
  deleteStay,
  settleGuestFee,
  unsettleGuestFee,
  StayWithExpense,
} from "@/lib/api/stays";
import {
  StaysCalendar,
  StaysList,
  AddStayModal,
  EditStayModal,
} from "@/components/calendar";

type TabType = "calendar" | "stays";

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { activeHouse } = useHouse();
  const { user } = useAuth();

  // Data state
  const [stays, setStays] = useState<StayWithExpense[]>([]);
  const [events, setEvents] = useState<Array<{ id: string; name: string; event_date: string; end_date: string | null }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>("calendar");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStay, setEditingStay] = useState<StayWithExpense | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!activeHouse) return;

    try {
      const [staysResult, eventsResult] = await Promise.all([
        getHouseStays(activeHouse.id),
        getHouseEvents(activeHouse.id),
      ]);

      if (staysResult.error) {
        console.error("Error fetching stays:", staysResult.error);
      } else {
        setStays(staysResult.stays);
      }

      if (eventsResult.error) {
        console.error("Error fetching events:", eventsResult.error);
      } else {
        setEvents(eventsResult.events);
      }
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeHouse]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  // Stay actions
  const handleAddStay = async (data: {
    checkIn: string;
    checkOut: string;
    notes?: string;
    guestCount: number;
  }) => {
    if (!activeHouse || !user) return;

    const { stay, error } = await createStay(activeHouse.id, user.id, data);

    if (error) {
      throw error;
    }

    // Refresh data
    fetchData();
  };

  const handleEditStay = async (data: {
    checkIn: string;
    checkOut: string;
    notes?: string;
    guestCount: number;
  }) => {
    if (!editingStay || !user) return;

    const { error } = await updateStay(editingStay.id, user.id, data);

    if (error) {
      throw error;
    }

    // Refresh data
    fetchData();
  };

  const handleDeleteStay = (stay: StayWithExpense) => {
    Alert.alert(
      "Delete Stay",
      "Are you sure you want to delete this stay? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteStay(stay.id);
            if (error) {
              Alert.alert("Error", error.message);
            } else {
              fetchData();
            }
          },
        },
      ]
    );
  };

  const handleSettleGuestFee = async (splitId: string) => {
    const { error } = await settleGuestFee(splitId);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      fetchData();
    }
  };

  const handleUnsettleGuestFee = async (splitId: string) => {
    const { error } = await unsettleGuestFee(splitId);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      fetchData();
    }
  };

  const openEditModal = (stay: StayWithExpense) => {
    setEditingStay(stay);
    setShowEditModal(true);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Calendar</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {activeHouse?.name || "No house selected"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <FontAwesome name="plus" size={16} color="#fff" />
          <Text style={styles.addButtonText}>Add Stay</Text>
        </TouchableOpacity>
      </View>

      {/* Tab switcher */}
      <View style={[styles.tabContainer, { backgroundColor: colors.muted }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "calendar" && { backgroundColor: colors.background },
          ]}
          onPress={() => setActiveTab("calendar")}
        >
          <FontAwesome
            name="calendar"
            size={14}
            color={activeTab === "calendar" ? colors.foreground : colors.mutedForeground}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "calendar" ? colors.foreground : colors.mutedForeground },
            ]}
          >
            Calendar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "stays" && { backgroundColor: colors.background },
          ]}
          onPress={() => setActiveTab("stays")}
        >
          <FontAwesome
            name="bed"
            size={14}
            color={activeTab === "stays" ? colors.foreground : colors.mutedForeground}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "stays" ? colors.foreground : colors.mutedForeground },
            ]}
          >
            Stays
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === "calendar" ? (
          <StaysCalendar
            stays={stays}
            events={events}
            onStayPress={openEditModal}
          />
        ) : (
          <StaysList
            stays={stays}
            onEditStay={openEditModal}
            onDeleteStay={handleDeleteStay}
            onSettleGuestFee={handleSettleGuestFee}
            onUnsettleGuestFee={handleUnsettleGuestFee}
          />
        )}
      </View>

      {/* Modals */}
      <AddStayModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddStay}
      />

      <EditStayModal
        visible={showEditModal}
        stay={editingStay}
        onClose={() => {
          setShowEditModal(false);
          setEditingStay(null);
        }}
        onSubmit={handleEditStay}
      />
    </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: typography.fontFamily.chillaxBold,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
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
    color: "#fff",
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginVertical: 12,
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
    paddingHorizontal: 12,
  },
});
