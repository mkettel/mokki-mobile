import React, { useRef, useEffect, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useColors } from "@/lib/context/theme";
import { typography } from "@/constants/theme";
import { EventBlock } from "./EventBlock";
import { NowIndicator } from "./NowIndicator";
import type { ItineraryEventWithDetails } from "@/types/database";

interface TimelineViewProps {
  events: ItineraryEventWithDetails[];
  selectedDate: string;
  isToday: boolean;
  isAdmin: boolean;
  onEventPress: (event: ItineraryEventWithDetails) => void;
  onAddEvent: (hour: number) => void;
}

const HOUR_HEIGHT = 70;
const START_HOUR = 6; // 6 AM
const END_HOUR = 23; // 11 PM
const LEFT_MARGIN = 50; // Width for time labels

// Format hour for display (e.g., "9 AM")
function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

// Parse time string (HH:MM) to minutes from midnight
function parseTimeToMinutes(timeString: string | null): number {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

// Calculate overlapping event columns
function calculateEventColumns(
  events: ItineraryEventWithDetails[]
): Map<string, { columnIndex: number; totalColumns: number }> {
  const columns = new Map<string, { columnIndex: number; totalColumns: number }>();

  // Sort events by start time
  const sortedEvents = [...events]
    .filter((e) => e.start_time)
    .sort((a, b) => {
      const aMinutes = parseTimeToMinutes(a.start_time);
      const bMinutes = parseTimeToMinutes(b.start_time);
      return aMinutes - bMinutes;
    });

  // Find overlapping groups
  const groups: ItineraryEventWithDetails[][] = [];
  let currentGroup: ItineraryEventWithDetails[] = [];

  for (const event of sortedEvents) {
    const eventStart = parseTimeToMinutes(event.start_time);
    const eventEnd = event.end_time
      ? parseTimeToMinutes(event.end_time)
      : eventStart + 60;

    // Check if event overlaps with current group
    const overlapsWithGroup = currentGroup.some((groupEvent) => {
      const groupStart = parseTimeToMinutes(groupEvent.start_time);
      const groupEnd = groupEvent.end_time
        ? parseTimeToMinutes(groupEvent.end_time)
        : groupStart + 60;
      return eventStart < groupEnd && eventEnd > groupStart;
    });

    if (overlapsWithGroup || currentGroup.length === 0) {
      currentGroup.push(event);
    } else {
      if (currentGroup.length > 0) groups.push(currentGroup);
      currentGroup = [event];
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  // Assign columns within each group
  for (const group of groups) {
    const totalColumns = group.length;
    group.forEach((event, index) => {
      columns.set(event.id, { columnIndex: index, totalColumns });
    });
  }

  // Events without start time get default values
  for (const event of events) {
    if (!columns.has(event.id)) {
      columns.set(event.id, { columnIndex: 0, totalColumns: 1 });
    }
  }

  return columns;
}

export function TimelineView({
  events,
  selectedDate,
  isToday,
  isAdmin,
  onEventPress,
  onAddEvent,
}: TimelineViewProps) {
  const colors = useColors();
  const scrollViewRef = useRef<ScrollView>(null);

  // Calculate event columns for overlapping
  const eventColumns = useMemo(() => calculateEventColumns(events), [events]);

  // Auto-scroll to current time on mount (for today)
  useEffect(() => {
    if (isToday && scrollViewRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      // Scroll to 1 hour before current time, centered
      const scrollY = Math.max(0, (currentHour - START_HOUR - 1) * HOUR_HEIGHT);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: scrollY, animated: false });
      }, 100);
    }
  }, [isToday, selectedDate]);

  // Generate hours array
  const hours = useMemo(() => {
    const result = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      result.push(h);
    }
    return result;
  }, []);

  // Handle long press on empty time slot
  const handleLongPress = (hour: number) => {
    if (isAdmin) {
      onAddEvent(hour);
    }
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Hour rows */}
      <View style={styles.timeline}>
        {hours.map((hour) => (
          <Pressable
            key={hour}
            style={[styles.hourRow, { height: HOUR_HEIGHT }]}
            onLongPress={() => handleLongPress(hour)}
            delayLongPress={500}
          >
            {/* Hour label */}
            <View style={[styles.hourLabelContainer, { width: LEFT_MARGIN }]}>
              <Text style={[styles.hourLabel, { color: colors.mutedForeground }]}>
                {formatHour(hour)}
              </Text>
            </View>

            {/* Hour line */}
            <View
              style={[styles.hourLine, { backgroundColor: colors.border }]}
            />
          </Pressable>
        ))}

        {/* Event blocks */}
        <View style={[styles.eventsContainer, { left: LEFT_MARGIN }]}>
          {events.map((event) => {
            const columnInfo = eventColumns.get(event.id);
            return (
              <EventBlock
                key={event.id}
                event={event}
                hourHeight={HOUR_HEIGHT}
                startHour={START_HOUR}
                columnIndex={columnInfo?.columnIndex}
                totalColumns={columnInfo?.totalColumns}
                onPress={() => onEventPress(event)}
              />
            );
          })}
        </View>

        {/* Now indicator (only for today) */}
        {isToday && (
          <View style={[styles.nowIndicatorContainer, { left: LEFT_MARGIN - 10 }]}>
            <NowIndicator hourHeight={HOUR_HEIGHT} startHour={START_HOUR} />
          </View>
        )}
      </View>

      {/* Empty state for no events */}
      {events.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: colors.mutedForeground }]}>
            No events scheduled
          </Text>
          {isAdmin && (
            <TouchableOpacity
              style={[styles.addButton, { borderColor: colors.border }]}
              onPress={() => onAddEvent(9)}
            >
              <FontAwesome name="plus" size={14} color={colors.primary} />
              <Text style={[styles.addButtonText, { color: colors.primary }]}>
                Add Event
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    minHeight: (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT,
  },
  timeline: {
    position: "relative",
  },
  hourRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  hourLabelContainer: {
    paddingRight: 8,
    alignItems: "flex-end",
    paddingTop: 0,
  },
  hourLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
    marginTop: -6,
  },
  hourLine: {
    flex: 1,
    height: 1,
  },
  eventsContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
  },
  nowIndicatorContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
  },
  emptyState: {
    position: "absolute",
    top: 200,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    marginBottom: 12,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
});
