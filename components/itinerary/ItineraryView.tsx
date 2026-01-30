import React, { useState, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useColors } from "@/lib/context/theme";
import { DayStrip } from "./DayStrip";
import { TimelineView } from "./TimelineView";
import { EventDetailModal } from "./EventDetailModal";
import { AddEventModal } from "./AddEventModal";
import { EditEventModal } from "./EditEventModal";
import { ChangeTripDatesModal } from "./ChangeTripDatesModal";
import { SessionRequestsSection } from "./SessionRequestsSection";
import type {
  ItineraryEventWithDetails,
  ItineraryEventCategory,
  ItineraryLink,
  ItineraryChecklistItem,
  SessionRequestWithProfiles,
} from "@/types/database";

interface ItineraryViewProps {
  events: ItineraryEventWithDetails[];
  tripStartDate: string;
  tripEndDate?: string;
  isAdmin: boolean;
  currentUserId?: string;
  onCreateEvent: (data: {
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
  }) => Promise<void>;
  onUpdateEvent: (
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
  ) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
  onSignUp: (eventId: string) => Promise<void>;
  onWithdraw: (eventId: string) => Promise<void>;
  onChangeTripDates?: (startDate: string, endDate: string) => Promise<void>;
  // Session booking props
  pendingSessionRequests?: SessionRequestWithProfiles[];
  acceptedSessions?: SessionRequestWithProfiles[];
  myPendingRequests?: SessionRequestWithProfiles[];
  houseName?: string;
  currentUserName?: string;
  onSessionRequestHandled?: () => void;
  // Session booking button props
  sessionBookingEnabled?: boolean;
  sessionBookingLabel?: string;
  onBookSession?: () => void;
}

// Get today's date in YYYY-MM-DD format
function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Determine initial selected date (today if within range, otherwise start date)
function getInitialSelectedDate(
  tripStartDate: string,
  tripEndDate?: string
): string {
  const today = getTodayString();

  // If today is within the trip range, select today
  if (today >= tripStartDate && (!tripEndDate || today <= tripEndDate)) {
    return today;
  }

  // Otherwise, select the trip start date
  return tripStartDate;
}

export function ItineraryView({
  events,
  tripStartDate,
  tripEndDate,
  isAdmin,
  currentUserId,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onSignUp,
  onWithdraw,
  onChangeTripDates,
  pendingSessionRequests = [],
  acceptedSessions = [],
  myPendingRequests = [],
  houseName,
  currentUserName,
  onSessionRequestHandled,
  sessionBookingEnabled,
  sessionBookingLabel,
  onBookSession,
}: ItineraryViewProps) {
  const colors = useColors();

  // Selected date state
  const [selectedDate, setSelectedDate] = useState(() =>
    getInitialSelectedDate(tripStartDate, tripEndDate)
  );

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChangeDatesModal, setShowChangeDatesModal] = useState(false);
  const [selectedEvent, setSelectedEvent] =
    useState<ItineraryEventWithDetails | null>(null);
  const [addEventHour, setAddEventHour] = useState<number | undefined>();

  // Filter events for selected date
  const eventsForDate = useMemo(
    () => events.filter((event) => event.event_date === selectedDate),
    [events, selectedDate]
  );

  // Filter accepted sessions for selected date
  const sessionsForDate = useMemo(
    () => acceptedSessions.filter((session) => session.requested_date === selectedDate),
    [acceptedSessions, selectedDate]
  );

  // Filter user's pending requests for selected date (tentative display)
  const pendingForDate = useMemo(
    () => myPendingRequests.filter((request) => request.requested_date === selectedDate),
    [myPendingRequests, selectedDate]
  );

  // Check if selected date is today
  const isToday = selectedDate === getTodayString();

  // Handlers
  const handleEventPress = (event: ItineraryEventWithDetails) => {
    setSelectedEvent(event);
    setShowDetailModal(true);
  };

  const handleAddEvent = (hour: number) => {
    setAddEventHour(hour);
    setShowAddModal(true);
  };

  const handleEditEvent = () => {
    setShowDetailModal(false);
    setShowEditModal(true);
  };

  const handleCreateEvent = async (data: {
    title: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    category?: ItineraryEventCategory;
    isOptional?: boolean;
    capacity?: number;
    links?: ItineraryLink[];
    checklist?: ItineraryChecklistItem[];
  }) => {
    await onCreateEvent({
      ...data,
      eventDate: selectedDate,
    });
    setShowAddModal(false);
    setAddEventHour(undefined);
  };

  const handleUpdateEvent = async (data: {
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
  }) => {
    if (!selectedEvent) return;
    await onUpdateEvent(selectedEvent.id, data);
    setShowEditModal(false);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    await onDeleteEvent(selectedEvent.id);
    setShowDetailModal(false);
    setShowEditModal(false);
    setSelectedEvent(null);
  };

  const handleSignUp = async () => {
    if (!selectedEvent) return;
    await onSignUp(selectedEvent.id);
    // Refresh the event data
    setShowDetailModal(false);
  };

  const handleWithdraw = async () => {
    if (!selectedEvent) return;
    await onWithdraw(selectedEvent.id);
    setShowDetailModal(false);
  };

  // Check if current user is signed up for selected event
  const isSignedUp = useMemo(() => {
    if (!selectedEvent || !currentUserId) return false;
    return selectedEvent.itinerary_event_signups?.some(
      (signup) => signup.user_id === currentUserId
    );
  }, [selectedEvent, currentUserId]);

  return (
    <View style={styles.container}>
      {/* Day Strip */}
      <DayStrip
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        isAdmin={isAdmin}
        onChangeDates={onChangeTripDates ? () => setShowChangeDatesModal(true) : undefined}
        sessionBookingEnabled={sessionBookingEnabled}
        sessionBookingLabel={sessionBookingLabel}
        onBookSession={onBookSession}
      />

      {/* Session Requests Section (Admin only) */}
      {isAdmin && pendingSessionRequests.length > 0 && onSessionRequestHandled && (
        <SessionRequestsSection
          requests={pendingSessionRequests}
          houseName={houseName}
          adminName={currentUserName}
          onRequestHandled={onSessionRequestHandled}
        />
      )}

      {/* Timeline View */}
      <TimelineView
        events={eventsForDate}
        sessions={sessionsForDate}
        pendingSessions={pendingForDate}
        currentUserId={currentUserId}
        selectedDate={selectedDate}
        isToday={isToday}
        isAdmin={isAdmin}
        onEventPress={handleEventPress}
        onAddEvent={handleAddEvent}
      />

      {/* Event Detail Modal */}
      <EventDetailModal
        visible={showDetailModal}
        event={selectedEvent}
        isAdmin={isAdmin}
        isSignedUp={isSignedUp}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedEvent(null);
        }}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
        onSignUp={handleSignUp}
        onWithdraw={handleWithdraw}
      />

      {/* Add Event Modal */}
      <AddEventModal
        visible={showAddModal}
        selectedDate={selectedDate}
        defaultHour={addEventHour}
        onClose={() => {
          setShowAddModal(false);
          setAddEventHour(undefined);
        }}
        onSubmit={handleCreateEvent}
      />

      {/* Edit Event Modal */}
      <EditEventModal
        visible={showEditModal}
        event={selectedEvent}
        onClose={() => {
          setShowEditModal(false);
          setSelectedEvent(null);
        }}
        onSubmit={handleUpdateEvent}
        onDelete={handleDeleteEvent}
      />

      {/* Change Trip Dates Modal (Admin only) */}
      {onChangeTripDates && (
        <ChangeTripDatesModal
          visible={showChangeDatesModal}
          currentStartDate={tripStartDate}
          currentEndDate={tripEndDate}
          onClose={() => setShowChangeDatesModal(false)}
          onSave={onChangeTripDates}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
