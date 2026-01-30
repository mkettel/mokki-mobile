import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

import { GeometricBackground } from "@/components/GeometricBackground";
import { PageContainer } from "@/components/PageContainer";
import { TopBar } from "@/components/TopBar";
import { ItineraryView } from "@/components/itinerary";
import { BookSessionModal } from "@/components/itinerary/BookSessionModal";
import { typography } from "@/constants/theme";
import {
  getHouseItinerary,
  createItineraryEvent,
  updateItineraryEvent,
  deleteItineraryEvent,
  signUpForEvent,
  withdrawFromEvent,
} from "@/lib/api/itinerary";
import {
  getPendingRequestsForAdmin,
  getAcceptedSessionsInRange,
  getMyPendingRequestsInRange,
} from "@/lib/api/sessionBooking";
import { updateHouseSettings } from "@/lib/api/house";
import { useAuth } from "@/lib/context/auth";
import { useHouse } from "@/lib/context/house";
import { useColors } from "@/lib/context/theme";
import type {
  HouseSettings,
  ItineraryEventWithDetails,
  ItineraryEventCategory,
  ItineraryLink,
  ItineraryChecklistItem,
  SessionRequestWithProfiles,
} from "@/types/database";

export default function ItineraryScreen() {
  const colors = useColors();
  const { activeHouse, refreshHouses } = useHouse();
  const { user } = useAuth();

  // Get trip dates from house settings
  const houseSettings = activeHouse?.settings as HouseSettings | undefined;
  const tripStartDate = houseSettings?.tripTimer?.startDate;
  const tripEndDate = houseSettings?.tripTimer?.endDate;
  const hasTripDates = !!tripStartDate;

  // Get session booking config
  const sessionBookingEnabled = houseSettings?.sessionBookingEnabled ?? false;
  const sessionBookingConfig = houseSettings?.sessionBookingConfig;

  // Check if user is admin
  const isAdmin = activeHouse?.role === "admin";

  // Data state
  const [events, setEvents] = useState<ItineraryEventWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Session booking state
  const [showBookSessionModal, setShowBookSessionModal] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<SessionRequestWithProfiles[]>([]);
  const [acceptedSessions, setAcceptedSessions] = useState<SessionRequestWithProfiles[]>([]);
  const [myPendingRequests, setMyPendingRequests] = useState<SessionRequestWithProfiles[]>([]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!activeHouse?.id || !hasTripDates) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch itinerary events
      const { events: fetchedEvents, error } = await getHouseItinerary(
        activeHouse.id
      );
      if (error) {
        console.error("Error fetching itinerary:", error);
      } else {
        setEvents(fetchedEvents);
      }

      // Fetch session booking data if enabled
      if (sessionBookingEnabled && user?.id && tripStartDate) {
        // Fetch pending requests for admins
        if (isAdmin) {
          const { requests, error: requestsError } = await getPendingRequestsForAdmin(
            activeHouse.id,
            user.id
          );
          if (!requestsError) {
            setPendingRequests(requests);
          }
        }

        // Fetch accepted sessions (for all users)
        const endDate = tripEndDate || tripStartDate;
        const { sessions, error: sessionsError } = await getAcceptedSessionsInRange(
          activeHouse.id,
          tripStartDate,
          endDate
        );
        if (!sessionsError) {
          setAcceptedSessions(sessions);
        }

        // Fetch user's own pending requests (for tentative display on itinerary)
        const { requests: myRequests, error: myRequestsError } = await getMyPendingRequestsInRange(
          activeHouse.id,
          user.id,
          tripStartDate,
          endDate
        );
        if (!myRequestsError) {
          setMyPendingRequests(myRequests);
        }
      }
    } catch (error) {
      console.error("Error fetching itinerary:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeHouse?.id, hasTripDates, sessionBookingEnabled, user?.id, isAdmin, tripStartDate, tripEndDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Event handlers
  const handleCreateEvent = async (data: {
    title: string;
    description?: string;
    eventDate: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    category?: ItineraryEventCategory;
    isOptional?: boolean;
    capacity?: number;
    links?: ItineraryLink[];
    checklist?: ItineraryChecklistItem[];
  }) => {
    if (!activeHouse?.id || !user?.id) return;

    const { event, error } = await createItineraryEvent(
      activeHouse.id,
      user.id,
      data
    );

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      await fetchData();
    }
  };

  const handleUpdateEvent = async (
    eventId: string,
    data: {
      title?: string;
      description?: string | null;
      eventDate?: string;
      startTime?: string | null;
      endTime?: string | null;
      location?: string | null;
      category?: ItineraryEventCategory | null;
      isOptional?: boolean;
      capacity?: number | null;
      links?: ItineraryLink[];
      checklist?: ItineraryChecklistItem[];
    }
  ) => {
    const { error } = await updateItineraryEvent(eventId, data);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      await fetchData();
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    Alert.alert(
      "Delete Event",
      "Are you sure you want to delete this event?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteItineraryEvent(eventId);
            if (error) {
              Alert.alert("Error", error.message);
            } else {
              await fetchData();
            }
          },
        },
      ]
    );
  };

  const handleSignUp = async (eventId: string) => {
    if (!user?.id) return;

    const { error } = await signUpForEvent(eventId, user.id);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      await fetchData();
    }
  };

  const handleWithdraw = async (eventId: string) => {
    if (!user?.id) return;

    const { error } = await withdrawFromEvent(eventId, user.id);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      await fetchData();
    }
  };

  const handleChangeTripDates = async (startDate: string, endDate: string) => {
    if (!activeHouse?.id) return;

    const { error } = await updateHouseSettings(activeHouse.id, {
      tripTimer: {
        enabled: true,
        startDate,
        endDate,
      },
    });

    if (error) {
      Alert.alert("Error", "Failed to update trip dates. Please try again.");
    } else {
      // Refresh houses to get updated settings
      await refreshHouses();
    }
  };

  // Empty state when trip dates aren't set
  if (!hasTripDates) {
    return (
      <PageContainer>
        <GeometricBackground />
        <TopBar />
        <View style={styles.emptyStateContainer}>
          <View
            style={[
              styles.emptyStateCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <FontAwesome
              name="calendar-o"
              size={48}
              color={colors.mutedForeground}
            />
            <Text
              style={[styles.emptyStateTitle, { color: colors.foreground }]}
            >
              Set Your Trip Dates
            </Text>
            <Text
              style={[
                styles.emptyStateDescription,
                { color: colors.mutedForeground },
              ]}
            >
              {isAdmin
                ? "Set your trip dates to start building the itinerary for your retreat."
                : "Trip dates haven't been set yet. Ask your organizer to set them up."}
            </Text>
            {isAdmin && (
              <TouchableOpacity
                style={[
                  styles.emptyStateButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => router.push("/house-settings")}
              >
                <Text
                  style={[
                    styles.emptyStateButtonText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  Go to Settings
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer>
        <GeometricBackground />
        <TopBar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.foreground} />
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <GeometricBackground />
      <TopBar />
      <ItineraryView
        events={events}
        tripStartDate={tripStartDate!}
        tripEndDate={tripEndDate}
        isAdmin={isAdmin}
        currentUserId={user?.id}
        onCreateEvent={handleCreateEvent}
        onUpdateEvent={handleUpdateEvent}
        onDeleteEvent={handleDeleteEvent}
        onSignUp={handleSignUp}
        onWithdraw={handleWithdraw}
        onChangeTripDates={isAdmin ? handleChangeTripDates : undefined}
        pendingSessionRequests={pendingRequests}
        acceptedSessions={acceptedSessions}
        myPendingRequests={myPendingRequests}
        houseName={activeHouse?.name}
        currentUserName={user?.user_metadata?.display_name || user?.email?.split("@")[0]}
        onSessionRequestHandled={fetchData}
        sessionBookingEnabled={sessionBookingEnabled}
        sessionBookingLabel={sessionBookingConfig?.label}
        onBookSession={() => setShowBookSessionModal(true)}
      />

      {/* Book Session Modal */}
      {sessionBookingEnabled && user?.id && (
        <BookSessionModal
          visible={showBookSessionModal}
          houseId={activeHouse?.id || ""}
          houseName={activeHouse?.name}
          currentUserId={user.id}
          currentUserName={user?.user_metadata?.display_name || user?.email?.split("@")[0]}
          tripStartDate={tripStartDate!}
          tripEndDate={tripEndDate}
          config={sessionBookingConfig}
          onClose={() => setShowBookSessionModal(false)}
          onSuccess={fetchData}
        />
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyStateCard: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    maxWidth: 320,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamily.chillaxSemibold,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateDescription: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyStateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
});
