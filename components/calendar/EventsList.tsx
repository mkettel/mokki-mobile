import { typography } from "@/constants/theme";
import type { EventWithDetails } from "@/lib/api/events";
import { useColors } from "@/lib/context/theme";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface EventsListProps {
  events: EventWithDetails[];
  currentUserId: string;
  onEditEvent?: (event: EventWithDetails) => void;
  onDeleteEvent?: (event: EventWithDetails) => void;
  showAll?: boolean;
}

type EventStatus = "today" | "upcoming" | "past";

function getEventStatus(event: EventWithDetails): EventStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventDate = new Date(event.event_date);
  eventDate.setHours(0, 0, 0, 0);

  const endDate = event.end_date ? new Date(event.end_date) : eventDate;
  endDate.setHours(0, 0, 0, 0);

  if (eventDate.getTime() === today.getTime()) {
    return "today";
  }
  if (eventDate > today || (eventDate <= today && endDate >= today)) {
    return "upcoming";
  }
  return "past";
}

function formatEventDate(event: EventWithDetails): string {
  const startDate = new Date(event.event_date);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  };

  let dateStr = startDate.toLocaleDateString("en-US", options);

  if (event.end_date && event.end_date !== event.event_date) {
    const endDate = new Date(event.end_date);
    dateStr += ` - ${endDate.toLocaleDateString("en-US", options)}`;
  }

  return dateStr;
}

function formatTime(time: string | null): string {
  if (!time) return "";

  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minutes} ${ampm}`;
}

function formatTimeRange(event: EventWithDetails): string | null {
  if (!event.event_time) return null;

  const startTime = formatTime(event.event_time);
  if (event.end_time) {
    const endTime = formatTime(event.end_time);
    return `${startTime} - ${endTime}`;
  }
  return startTime;
}

function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export function EventsList({
  events,
  currentUserId,
  onEditEvent,
  onDeleteEvent,
  showAll = false,
}: EventsListProps) {
  const colors = useColors();

  // Categorize events
  const categorizedEvents = React.useMemo(() => {
    const upcoming: EventWithDetails[] = [];
    const past: EventWithDetails[] = [];

    events.forEach((event) => {
      const status = getEventStatus(event);
      if (status === "past") {
        past.push(event);
      } else {
        upcoming.push(event);
      }
    });

    // Sort
    upcoming.sort(
      (a, b) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
    past.sort(
      (a, b) =>
        new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
    );

    return { upcoming, past };
  }, [events]);

  // Limit display if not showAll
  const displayEvents = showAll
    ? [...categorizedEvents.upcoming, ...categorizedEvents.past]
    : categorizedEvents.upcoming.slice(0, 10);

  const getStatusBadge = (status: EventStatus) => {
    const configs = {
      today: { bg: "#fbbf24", text: "#78350f", label: "Today" },
      upcoming: {
        bg: colors.muted,
        text: colors.foreground,
        label: "Upcoming",
      },
      past: { bg: colors.muted, text: colors.mutedForeground, label: "Past" },
    };
    return configs[status];
  };

  const isCreator = (event: EventWithDetails) => {
    return currentUserId === event.created_by;
  };

  const isPast = (event: EventWithDetails) => {
    return getEventStatus(event) === "past";
  };

  const getCreatorName = (event: EventWithDetails) => {
    const profile = event.profiles;
    return profile.display_name || profile.email.split("@")[0];
  };

  const getParticipantInitial = (profile: {
    display_name: string | null;
    email: string;
  }) => {
    const name = profile.display_name || profile.email;
    return name.charAt(0).toUpperCase();
  };

  if (displayEvents.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome
          name="calendar-o"
          size={48}
          color={colors.mutedForeground}
        />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          No events yet
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
          Add an event to see it here
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {displayEvents.map((event) => {
        const status = getEventStatus(event);
        const statusConfig = getStatusBadge(status);
        const canEdit = isCreator(event) && !isPast(event);
        const canDelete = isCreator(event) && !isPast(event);
        const timeRange = formatTimeRange(event);

        return (
          <View
            key={event.id}
            style={[
              styles.eventCard,
              {
                backgroundColor: colors.card,
                borderColor: "#fbbf24",
                borderLeftWidth: 4,
                borderRadius: 0,
              },
            ]}
          >
            {/* Header row */}
            <View style={styles.cardHeader}>
              {/* Calendar icon */}
              <View
                style={[styles.iconContainer, { backgroundColor: "#fef3c7" }]}
              >
                <FontAwesome name="calendar" size={18} color="#d97706" />
              </View>

              {/* Name and status */}
              <View style={styles.headerInfo}>
                <View style={styles.nameRow}>
                  <Text
                    style={[styles.eventName, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {event.name}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusConfig.bg },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: statusConfig.text }]}
                    >
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.createdBy, { color: colors.mutedForeground }]}
                >
                  by {getCreatorName(event)}
                </Text>
              </View>

              {/* Action buttons */}
              {(canEdit || canDelete) && (
                <View style={styles.actions}>
                  {canEdit && onEditEvent && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => onEditEvent(event)}
                    >
                      <FontAwesome
                        name="pencil"
                        size={14}
                        color={colors.mutedForeground}
                      />
                    </TouchableOpacity>
                  )}
                  {canDelete && onDeleteEvent && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => onDeleteEvent(event)}
                    >
                      <FontAwesome
                        name="trash-o"
                        size={14}
                        color={colors.destructive}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Date and time */}
            <View style={styles.dateTimeRow}>
              <FontAwesome
                name="clock-o"
                size={12}
                color={colors.mutedForeground}
              />
              <Text
                style={[styles.dateText, { color: colors.mutedForeground }]}
              >
                {formatEventDate(event)}
                {timeRange && ` · ${timeRange}`}
              </Text>
            </View>

            {/* Description */}
            {event.description && (
              <Text
                style={[styles.description, { color: colors.mutedForeground }]}
                numberOfLines={2}
              >
                {event.description}
              </Text>
            )}

            {/* Links */}
            {event.links && event.links.length > 0 && (
              <View style={styles.linksContainer}>
                {event.links.map((link, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.linkBadge,
                      { backgroundColor: colors.muted },
                    ]}
                    onPress={() => Linking.openURL(link)}
                  >
                    <FontAwesome
                      name="external-link"
                      size={10}
                      color={colors.primary}
                    />
                    <Text style={[styles.linkText, { color: colors.primary }]}>
                      {getDomainFromUrl(link)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Participants */}
            {event.event_participants &&
              event.event_participants.length > 0 && (
                <View
                  style={[
                    styles.participantsRow,
                    { borderTopColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.participantsLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Tagged:
                  </Text>
                  <View style={styles.participantAvatars}>
                    {event.event_participants
                      .slice(0, 5)
                      .map((participant, index) => (
                        <View
                          key={participant.id}
                          style={[
                            styles.participantAvatar,
                            {
                              backgroundColor: colors.primary,
                              marginLeft: index > 0 ? -8 : 0,
                            },
                          ]}
                        >
                          <Text style={styles.participantInitial}>
                            {getParticipantInitial(participant.profiles)}
                          </Text>
                        </View>
                      ))}
                    {event.event_participants.length > 5 && (
                      <View
                        style={[
                          styles.participantAvatar,
                          { backgroundColor: colors.muted, marginLeft: -8 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.participantCount,
                            { color: colors.foreground },
                          ]}
                        >
                          +{event.event_participants.length - 5}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
          </View>
        );
      })}

      {/* Show more indicator */}
      {!showAll && categorizedEvents.past.length > 0 && (
        <View style={styles.showMoreContainer}>
          <Text
            style={[styles.showMoreText, { color: colors.mutedForeground }]}
          >
            + {categorizedEvents.past.length} past event
            {categorizedEvents.past.length > 1 ? "s" : ""}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  eventCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  eventName: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  createdBy: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    marginLeft: 52,
  },
  dateText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  description: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 8,
    marginLeft: 52,
    fontStyle: "italic",
  },
  linksContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    marginLeft: 52,
  },
  linkBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  linkText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
  },
  participantsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  participantsLabel: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
  participantAvatars: {
    flexDirection: "row",
  },
  participantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  participantInitial: {
    color: "#fff",
    fontSize: 11,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  participantCount: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  showMoreContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  showMoreText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
});
