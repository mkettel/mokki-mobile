import { SESSION_BLOCK_STYLE, SESSION_BLOCK_TENTATIVE_STYLE } from "@/constants/sessionBooking";
import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import type { SessionRequestWithProfiles } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface SessionBlockProps {
  session: SessionRequestWithProfiles;
  currentUserId: string;
  hourHeight: number;
  startHour: number;
  columnIndex?: number;
  totalColumns?: number;
  onPress?: () => void;
  isTentative?: boolean;
}

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
  startTime: string,
  durationMinutes: number,
  hourHeight: number,
  startHour: number
): { top: number; height: number } {
  const MIN_HEIGHT = 50;

  const startMinutes = parseTimeToMinutes(startTime);
  const top = ((startMinutes - startHour * 60) / 60) * hourHeight;
  const height = Math.max((durationMinutes / 60) * hourHeight, MIN_HEIGHT);

  return { top, height };
}

export function SessionBlock({
  session,
  currentUserId,
  hourHeight,
  startHour,
  columnIndex = 0,
  totalColumns = 1,
  onPress,
  isTentative = false,
}: SessionBlockProps) {
  const colors = useColors();
  const { top, height } = calculateBlockLayout(
    session.requested_time,
    session.duration_minutes,
    hourHeight,
    startHour
  );

  // Get the appropriate styling based on tentative state
  const blockStyle = isTentative ? SESSION_BLOCK_TENTATIVE_STYLE : SESSION_BLOCK_STYLE;

  // Check if current user is a participant in this session
  const isParticipant =
    session.requester_id === currentUserId || session.admin_id === currentUserId;

  // For participants: show the "other person"
  // For non-participants: only show the admin (as "busy")
  const isRequester = session.requester_id === currentUserId;
  const otherPerson = isRequester ? session.admin : session.requester;
  const adminPerson = session.admin;

  // Display name depends on whether user is a participant
  const displayName = isParticipant
    ? otherPerson.display_name || otherPerson.email.split("@")[0]
    : adminPerson.display_name || adminPerson.email.split("@")[0];
  const initial = displayName.charAt(0).toUpperCase();

  // Avatar to show (participant sees other person, non-participant sees admin)
  const avatarPerson = isParticipant ? otherPerson : adminPerson;

  // Calculate width and left offset for overlapping events
  const columnWidth = 100 / totalColumns;
  const leftPercent = columnIndex * columnWidth;

  // Use compact layout for small blocks
  const isCompact = height < 70;

  // Build the display title
  const getTitle = () => {
    if (isTentative) {
      return `Pending: ${displayName}`;
    }
    if (isParticipant) {
      return `Session with ${displayName}`;
    }
    return `${displayName} - Busy`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          top,
          height,
          left: `${leftPercent + 1}%`,
          width: `${columnWidth - 2}%`,
          backgroundColor: blockStyle.backgroundColor,
          borderLeftColor: blockStyle.borderColor,
          borderColor: colors.border,
          opacity: isTentative ? 0.9 : 1,
        },
        isTentative && styles.tentativeContainer,
      ]}
      onPress={isParticipant && !isTentative ? onPress : undefined}
      activeOpacity={0.7}
      disabled={!isParticipant || !onPress || isTentative}
    >
      <View style={[styles.content, isCompact && styles.contentCompact]}>
        {/* Avatar and Title */}
        <View style={styles.header}>
          {avatarPerson.avatar_url ? (
            <Image
              source={{ uri: avatarPerson.avatar_url }}
              style={[styles.avatar, isTentative && { opacity: 0.6 }]}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                { backgroundColor: blockStyle.borderColor + "30" },
              ]}
            >
              <Text
                style={[
                  styles.avatarText,
                  { color: blockStyle.borderColor },
                ]}
              >
                {initial}
              </Text>
            </View>
          )}

          <View style={styles.titleContainer}>
            <Text
              style={[styles.title, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {getTitle()}
            </Text>
            <Text style={[styles.time, { color: colors.mutedForeground }]}>
              {formatTime(session.requested_time)}
              {!isCompact && ` (${session.duration_minutes}m)`}
            </Text>
          </View>
        </View>

        {/* Session icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: blockStyle.borderColor + "20" },
          ]}
        >
          <FontAwesome
            name={blockStyle.iconName}
            size={isCompact ? 10 : 12}
            color={blockStyle.borderColor}
          />
        </View>
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
  tentativeContainer: {
    borderStyle: "dashed",
  },
  content: {
    flex: 1,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contentCompact: {
    padding: 6,
  },
  header: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
    lineHeight: 15,
  },
  time: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 1,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});
