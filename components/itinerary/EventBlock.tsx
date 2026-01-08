import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import type {
  ItineraryEventCategory,
  ItineraryEventWithDetails,
} from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface EventBlockProps {
  event: ItineraryEventWithDetails;
  hourHeight: number;
  startHour: number;
  columnIndex?: number;
  totalColumns?: number;
  onPress: () => void;
}

// Category colors and icons
const CATEGORY_CONFIG: Record<
  ItineraryEventCategory,
  { color: string; icon: string }
> = {
  meal: { color: "#f97316", icon: "cutlery" },
  workshop: { color: "#8b5cf6", icon: "pencil" },
  activity: { color: "#22c55e", icon: "bolt" },
  free_time: { color: "#64748b", icon: "coffee" },
  travel: { color: "#3b82f6", icon: "car" },
  other: { color: "#6b7280", icon: "star" },
};

// Parse time string (HH:MM) to minutes from midnight
function parseTimeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

// Format time for display (e.g., "9:00 AM")
function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Calculate block position and height
function calculateBlockLayout(
  startTime: string | null,
  endTime: string | null,
  hourHeight: number,
  startHour: number
): { top: number; height: number } {
  const DEFAULT_DURATION_MINUTES = 60; // Default 1 hour if no end time
  const MIN_HEIGHT = 50;

  if (!startTime) {
    return { top: 0, height: MIN_HEIGHT };
  }

  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = endTime
    ? parseTimeToMinutes(endTime)
    : startMinutes + DEFAULT_DURATION_MINUTES;

  const durationMinutes = Math.max(endMinutes - startMinutes, 30); // Minimum 30 min
  const top = ((startMinutes - startHour * 60) / 60) * hourHeight;
  const height = Math.max((durationMinutes / 60) * hourHeight, MIN_HEIGHT);

  return { top, height };
}

export function EventBlock({
  event,
  hourHeight,
  startHour,
  columnIndex = 0,
  totalColumns = 1,
  onPress,
}: EventBlockProps) {
  const colors = useColors();
  const { top, height } = calculateBlockLayout(
    event.start_time,
    event.end_time,
    hourHeight,
    startHour
  );

  const category = event.category || "other";
  const categoryConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
  const signupCount = event.itinerary_event_signups?.length || 0;

  // Calculate width and left offset for overlapping events
  const columnWidth = 100 / totalColumns;
  const leftPercent = columnIndex * columnWidth;

  // Use compact two-column layout for small blocks
  const isCompact = height < 80;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          top,
          height,
          left: `${leftPercent + 1}%`,
          width: `${columnWidth - 2}%`,
          backgroundColor: colors.card,
          borderLeftColor: categoryConfig.color,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.content, isCompact && styles.contentCompact]}>
        {/* Left column: Title and time */}
        <View style={[styles.leftColumn, isCompact && styles.leftColumnCompact]}>
          <View style={styles.header}>
            <FontAwesome
              name={categoryConfig.icon as any}
              size={12}
              color={categoryConfig.color}
            />
            <Text
              style={[styles.title, { color: colors.foreground }]}
              numberOfLines={isCompact ? 1 : 2}
            >
              {event.title}
            </Text>
          </View>

          {event.start_time && (
            <Text style={[styles.time, { color: colors.mutedForeground }]}>
              {formatTime(event.start_time)}
              {event.end_time && !isCompact && ` - ${formatTime(event.end_time)}`}
            </Text>
          )}
        </View>

        {/* Right column: Details (for compact) or below (for tall blocks) */}
        {isCompact ? (
          <View style={styles.rightColumn}>
            {event.location && (
              <Text
                style={[styles.locationCompact, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {event.location}
              </Text>
            )}
            <View style={styles.badges}>
              {event.is_optional && (
                <View
                  style={[styles.optionalBadge, { backgroundColor: colors.muted }]}
                >
                  <Text
                    style={[styles.optionalText, { color: colors.mutedForeground }]}
                  >
                    Opt
                  </Text>
                </View>
              )}
              {signupCount > 0 && (
                <View style={styles.signupIndicator}>
                  <FontAwesome
                    name="users"
                    size={10}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={[styles.signupCount, { color: colors.mutedForeground }]}
                  >
                    {signupCount}
                    {event.capacity && `/${event.capacity}`}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <>
            {event.location && (
              <Text
                style={[styles.location, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {event.location}
              </Text>
            )}

            <View style={styles.footer}>
              {event.is_optional && (
                <View
                  style={[styles.optionalBadge, { backgroundColor: colors.muted }]}
                >
                  <Text
                    style={[styles.optionalText, { color: colors.mutedForeground }]}
                  >
                    Optional
                  </Text>
                </View>
              )}

              {signupCount > 0 && (
                <View style={styles.signupIndicator}>
                  <FontAwesome
                    name="users"
                    size={10}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={[styles.signupCount, { color: colors.mutedForeground }]}
                  >
                    {signupCount}
                    {event.capacity && `/${event.capacity}`}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    padding: 8,
  },
  contentCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftColumn: {
    flex: 1,
  },
  leftColumnCompact: {
    flex: 1,
    marginRight: 8,
  },
  rightColumn: {
    alignItems: "flex-end",
    justifyContent: "center",
    flexShrink: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
    lineHeight: 16,
  },
  time: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  location: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  locationCompact: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "right",
  },
  badges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: "auto",
  },
  optionalBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  optionalText: {
    fontSize: 9,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  signupIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  signupCount: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillax,
  },
});
