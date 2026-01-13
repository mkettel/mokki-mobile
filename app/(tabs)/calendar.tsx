import {
  AddEventModal,
  AddStayModal,
  DayDetailModal,
  EditEventModal,
  EditStayModal,
  EventDetailModal,
  EventsList,
  StaysCalendar,
  StayDetailModal,
  StaysList,
} from "@/components/calendar";
import { GeometricBackground } from "@/components/GeometricBackground";
import { PageContainer } from "@/components/PageContainer";
import { TopBar } from "@/components/TopBar";
import { typography } from "@/constants/theme";
import {
  createEvent,
  deleteEvent,
  EventWithDetails,
  getHouseEvents,
  getHouseMembersForEvents,
  updateEvent,
} from "@/lib/api/events";
import {
  createStay,
  deleteStay,
  getHouseStays,
  GUEST_FEE_PER_NIGHT,
  settleGuestFee,
  StayWithExpense,
  unsettleGuestFee,
  updateStay,
} from "@/lib/api/stays";
import { useAuth } from "@/lib/context/auth";
import { useHouse } from "@/lib/context/house";
import { useColors } from "@/lib/context/theme";
import { supabase } from "@/lib/supabase/client";
import type { HouseSettings, Profile } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type TabType = "calendar" | "stays" | "events";

export default function CalendarScreen() {
  const colors = useColors();
  const { activeHouse } = useHouse();
  const { user } = useAuth();

  // Get guest nightly rate from house settings (with fallback to default)
  const guestNightlyRate =
    (activeHouse?.settings as HouseSettings | undefined)?.guestNightlyRate ??
    GUEST_FEE_PER_NIGHT;

  // Get bed signup enabled status from house settings
  const bedSignupEnabled =
    (activeHouse?.settings as HouseSettings | undefined)?.bedSignupEnabled ??
    false;

  // Data state
  const [stays, setStays] = useState<StayWithExpense[]>([]);
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>("calendar");

  // Stay modals
  const [showAddStayModal, setShowAddStayModal] = useState(false);
  const [showEditStayModal, setShowEditStayModal] = useState(false);
  const [showStayDetailModal, setShowStayDetailModal] = useState(false);
  const [editingStay, setEditingStay] = useState<StayWithExpense | null>(null);
  const [viewingStay, setViewingStay] = useState<StayWithExpense | null>(null);

  // Event modals
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [showEventDetailModal, setShowEventDetailModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithDetails | null>(
    null
  );
  const [viewingEvent, setViewingEvent] = useState<EventWithDetails | null>(
    null
  );

  // Day detail modal
  const [showDayDetailModal, setShowDayDetailModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!activeHouse) return;

    try {
      const [staysResult, eventsResult, membersResult] = await Promise.all([
        getHouseStays(activeHouse.id),
        getHouseEvents(activeHouse.id),
        getHouseMembersForEvents(activeHouse.id),
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

      if (membersResult.error) {
        console.error("Error fetching members:", membersResult.error);
      } else {
        setMembers(membersResult.members);
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

  // Realtime subscription for stays and bed signups
  useEffect(() => {
    if (!activeHouse?.id) return;

    const staysChannel = supabase
      .channel(`calendar_stays:${activeHouse.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stays",
          filter: `house_id=eq.${activeHouse.id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    const bedSignupsChannel = supabase
      .channel(`calendar_bed_signups:${activeHouse.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bed_signups",
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(staysChannel);
      supabase.removeChannel(bedSignupsChannel);
    };
  }, [activeHouse?.id, fetchData]);

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
    bedSignupId?: string;
  }) => {
    if (!activeHouse || !user) return;

    const { stay, error } = await createStay(activeHouse.id, user.id, {
      ...data,
      guestNightlyRate,
    });

    if (error) {
      throw error;
    }

    fetchData();
  };

  const handleEditStay = async (data: {
    checkIn: string;
    checkOut: string;
    notes?: string;
    guestCount: number;
    bedSignupId?: string;
  }) => {
    if (!editingStay || !user) return;

    const { error } = await updateStay(editingStay.id, user.id, {
      ...data,
      guestNightlyRate,
    });

    if (error) {
      throw error;
    }

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

  const openEditStayModal = (stay: StayWithExpense) => {
    setEditingStay(stay);
    setShowEditStayModal(true);
  };

  const openStayDetailModal = (stay: StayWithExpense) => {
    setViewingStay(stay);
    setShowStayDetailModal(true);
  };

  const handleStayDetailEdit = (stay: StayWithExpense) => {
    setViewingStay(null);
    setShowStayDetailModal(false);
    openEditStayModal(stay);
  };

  const handleStayDetailDelete = (stay: StayWithExpense) => {
    setViewingStay(null);
    setShowStayDetailModal(false);
    handleDeleteStay(stay);
  };

  // Event actions
  const handleAddEvent = async (data: {
    name: string;
    description?: string;
    eventDate: string;
    eventTime?: string;
    endDate?: string;
    endTime?: string;
    links?: string[];
    participantIds?: string[];
  }) => {
    if (!activeHouse || !user) return;

    const { error } = await createEvent(activeHouse.id, user.id, data);

    if (error) {
      throw error;
    }

    fetchData();
  };

  const handleEditEvent = async (data: {
    name: string;
    description?: string;
    eventDate: string;
    eventTime?: string;
    endDate?: string;
    endTime?: string;
    links?: string[];
    participantIds?: string[];
  }) => {
    if (!editingEvent) return;

    const { error } = await updateEvent(editingEvent.id, user!.id, data);

    if (error) {
      throw error;
    }

    fetchData();
  };

  const handleDeleteEvent = (event: EventWithDetails) => {
    Alert.alert(
      "Delete Event",
      "Are you sure you want to delete this event? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteEvent(event.id);
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

  const openEditEventModal = (event: EventWithDetails) => {
    setEditingEvent(event);
    setShowEditEventModal(true);
  };

  const openEventDetailModal = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (event) {
      setViewingEvent(event);
      setShowEventDetailModal(true);
    }
  };

  const handleEventDetailEdit = (event: EventWithDetails) => {
    setViewingEvent(null);
    setShowEventDetailModal(false);
    openEditEventModal(event);
  };

  const handleEventDetailDelete = (event: EventWithDetails) => {
    setViewingEvent(null);
    setShowEventDetailModal(false);
    handleDeleteEvent(event);
  };

  // Day detail modal handlers
  const handleDayPress = (date: Date) => {
    setSelectedDate(date);
    setShowDayDetailModal(true);
  };

  const handleDayDetailStayPress = (stay: StayWithExpense) => {
    setShowDayDetailModal(false);
    setSelectedDate(null);
    openStayDetailModal(stay);
  };

  // Handle add button based on active tab
  const handleAddPress = () => {
    if (activeTab === "events") {
      setShowAddEventModal(true);
    } else {
      setShowAddStayModal(true);
    }
  };

  const getAddButtonText = () => {
    return activeTab === "events" ? "Add Event" : "Add Stay";
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <GeometricBackground />
        <Text style={[styles.loadingHeader, { color: colors.foreground }]}>MÖKKI</Text>
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  return (
    <PageContainer>
      <GeometricBackground />
      <TopBar />

      {/* Header with action button */}
      <View style={styles.header}>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Reserve your bed
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleAddPress}
        >
          <FontAwesome name="plus" size={16} color={colors.primaryForeground} />
          <Text
            style={[styles.addButtonText, { color: colors.primaryForeground }]}
          >
            {getAddButtonText()}
          </Text>
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
            color={
              activeTab === "calendar"
                ? colors.foreground
                : colors.mutedForeground
            }
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "calendar"
                    ? colors.foreground
                    : colors.mutedForeground,
              },
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
            color={
              activeTab === "stays" ? colors.foreground : colors.mutedForeground
            }
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "stays"
                    ? colors.foreground
                    : colors.mutedForeground,
              },
            ]}
          >
            Stays
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "events" && { backgroundColor: colors.background },
          ]}
          onPress={() => setActiveTab("events")}
        >
          <FontAwesome
            name="star"
            size={14}
            color={
              activeTab === "events"
                ? colors.foreground
                : colors.mutedForeground
            }
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "events"
                    ? colors.foreground
                    : colors.mutedForeground,
              },
            ]}
          >
            Events
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === "calendar" ? (
          <StaysCalendar
            stays={stays}
            events={events}
            onDayPress={handleDayPress}
            onStayPress={openStayDetailModal}
            onEventPress={(event) => openEventDetailModal(event.id)}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
          />
        ) : activeTab === "stays" ? (
          <StaysList
            stays={stays}
            onViewStay={openStayDetailModal}
            onEditStay={openEditStayModal}
            onDeleteStay={handleDeleteStay}
            onSettleGuestFee={handleSettleGuestFee}
            onUnsettleGuestFee={handleUnsettleGuestFee}
            showAll={true}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
          />
        ) : (
          <EventsList
            events={events}
            currentUserId={user?.id || ""}
            onEditEvent={openEditEventModal}
            onDeleteEvent={handleDeleteEvent}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
          />
        )}
      </View>

      {/* Stay Modals */}
      <AddStayModal
        visible={showAddStayModal}
        onClose={() => setShowAddStayModal(false)}
        onSubmit={handleAddStay}
        guestNightlyRate={guestNightlyRate}
        houseId={activeHouse?.id}
        userId={user?.id}
        bedSignupEnabled={bedSignupEnabled}
      />

      <EditStayModal
        visible={showEditStayModal}
        stay={editingStay}
        onClose={() => {
          setShowEditStayModal(false);
          setEditingStay(null);
          // Refresh data in case a bed was selected (bed is linked immediately now)
          fetchData();
        }}
        onSubmit={handleEditStay}
        guestNightlyRate={guestNightlyRate}
        houseId={activeHouse?.id}
        userId={user?.id}
        bedSignupEnabled={bedSignupEnabled}
      />

      <StayDetailModal
        visible={showStayDetailModal}
        stay={viewingStay}
        currentUserId={user?.id || ""}
        onClose={() => {
          setShowStayDetailModal(false);
          setViewingStay(null);
        }}
        onEdit={handleStayDetailEdit}
        onDelete={handleStayDetailDelete}
      />

      {/* Event Modals */}
      <AddEventModal
        visible={showAddEventModal}
        onClose={() => setShowAddEventModal(false)}
        onSubmit={handleAddEvent}
        members={members}
      />

      <EditEventModal
        visible={showEditEventModal}
        event={editingEvent}
        onClose={() => {
          setShowEditEventModal(false);
          setEditingEvent(null);
        }}
        onSubmit={handleEditEvent}
        members={members}
      />

      <EventDetailModal
        visible={showEventDetailModal}
        event={viewingEvent}
        currentUserId={user?.id || ""}
        onClose={() => {
          setShowEventDetailModal(false);
          setViewingEvent(null);
        }}
        onEdit={handleEventDetailEdit}
        onDelete={handleEventDetailDelete}
      />

      {/* Day Detail Modal */}
      <DayDetailModal
        visible={showDayDetailModal}
        date={selectedDate}
        stays={stays}
        onClose={() => {
          setShowDayDetailModal(false);
          setSelectedDate(null);
        }}
        onStayPress={handleDayDetailStayPress}
        houseId={activeHouse?.id}
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
  loadingHeader: {
    fontSize: 24,
    fontFamily: typography.fontFamily.chillaxBold,
    marginBottom: 12,
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
