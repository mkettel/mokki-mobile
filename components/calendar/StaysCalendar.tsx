import { typography } from "@/constants/theme";
import type { StayWithExpense } from "@/lib/api/stays";
import { useColors } from "@/lib/context/theme";
import { FontAwesome } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DAY_WIDTH = (SCREEN_WIDTH - 48) / 7; // 24px padding on each side

// Colors for different users (deterministic based on user ID)
const STAY_COLORS = [
  "#93c5fd", // blue-300
  "#86efac", // green-300
  "#c4b5fd", // violet-300
  "#fdba74", // orange-300
  "#f9a8d4", // pink-300
  "#5eead4", // teal-300
  "#a5b4fc", // indigo-300
  "#fda4af", // rose-300
];

// Format date as YYYY-MM-DD using local time (avoids timezone issues)
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Parse a date string as local time (not UTC)
// YYYY-MM-DD strings are interpreted as UTC by default, which causes timezone issues
function parseLocalDate(dateString: string): Date {
  // If it's a date-only string (YYYY-MM-DD), parse as local time
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  // Otherwise, let Date parse it normally (for full timestamps)
  return new Date(dateString);
}

// Simple hash function for user ID to color
function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return STAY_COLORS[Math.abs(hash) % STAY_COLORS.length];
}

interface CalendarEvent {
  id: string;
  name: string;
  event_date: string;
  end_date: string | null;
}

interface StaysCalendarProps {
  stays: StayWithExpense[];
  events?: CalendarEvent[];
  onDayPress?: (date: Date) => void;
  onStayPress?: (stay: StayWithExpense) => void;
  onEventPress?: (event: CalendarEvent) => void;
}

export function StaysCalendar({
  stays,
  events = [],
  onDayPress,
  onStayPress,
  onEventPress,
}: StaysCalendarProps) {
  const colors = useColors();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get calendar days for the current month view
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = lastDay.getDate();

    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month padding (fill to 6 rows)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  // Group stays and events by date
  const itemsByDate = useMemo(() => {
    const map: Record<
      string,
      { stays: StayWithExpense[]; events: typeof events }
    > = {};

    // Add stays
    stays.forEach((stay) => {
      const checkIn = new Date(stay.check_in);
      const checkOut = new Date(stay.check_out);

      // Add stay to each day in range
      let current = new Date(checkIn);
      while (current <= checkOut) {
        const key = formatDateKey(current);
        if (!map[key]) {
          map[key] = { stays: [], events: [] };
        }
        map[key].stays.push(stay);
        current.setDate(current.getDate() + 1);
      }
    });

    // Add events
    events.forEach((event) => {
      const startDate = parseLocalDate(event.event_date);
      const endDate = event.end_date ? parseLocalDate(event.end_date) : startDate;

      let current = new Date(startDate);
      while (current <= endDate) {
        const key = formatDateKey(current);
        if (!map[key]) {
          map[key] = { stays: [], events: [] };
        }
        map[key].events.push(event);
        current.setDate(current.getDate() + 1);
      }
    });

    return map;
  }, [stays, events]);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const formatMonthYear = () => {
    return currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Get display name for a stay
  const getStayDisplayName = (stay: StayWithExpense) => {
    const profile = stay.profiles;
    if (profile.display_name) {
      return profile.display_name.split(" ")[0]; // First name only
    }
    return profile.email.split("@")[0];
  };

  return (
    <View style={styles.container}>
      {/* Header with month navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
          <FontAwesome
            name="chevron-left"
            size={16}
            color={colors.foreground}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.monthYear, { color: colors.foreground }]}>
            {formatMonthYear()}
          </Text>
          <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
            <Text style={[styles.todayText, { color: colors.primary }]}>
              Today
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <FontAwesome
            name="chevron-right"
            size={16}
            color={colors.foreground}
          />
        </TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekDays}>
        {weekDays.map((day) => (
          <View key={day} style={styles.weekDayCell}>
            <Text
              style={[styles.weekDayText, { color: colors.mutedForeground }]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <ScrollView
        style={styles.calendarGrid}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.daysContainer}>
          {calendarDays.map((dayInfo, index) => {
            const dateKey = formatDateKey(dayInfo.date);
            const dayItems = itemsByDate[dateKey] || { stays: [], events: [] };
            const isTodayDate = isToday(dayInfo.date);

            // Limit display to 3 items
            const displayStays = dayItems.stays.slice(0, 3);
            const remainingCount =
              dayItems.stays.length + dayItems.events.length - 3;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  { borderColor: colors.border },
                  !dayInfo.isCurrentMonth && styles.otherMonthCell,
                ]}
                onPress={() => onDayPress?.(dayInfo.date)}
                activeOpacity={0.7}
              >
                <View style={styles.dayCellContent}>
                  <View
                    style={[
                      styles.dateNumber,
                      isTodayDate && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateText,
                        {
                          color: isTodayDate
                            ? colors.primaryForeground
                            : dayInfo.isCurrentMonth
                            ? colors.foreground
                            : colors.foreground,
                        },
                      ]}
                    >
                      {dayInfo.date.getDate()}
                    </Text>
                  </View>

                  {/* Stay badges */}
                  <View style={styles.itemsContainer}>
                    {displayStays.map((stay, i) => (
                      <TouchableOpacity
                        key={`stay-${stay.id}-${i}`}
                        style={[
                          styles.stayBadge,
                          { backgroundColor: getUserColor(stay.user_id) },
                        ]}
                        onPress={() => onStayPress?.(stay)}
                      >
                        <Text style={styles.stayBadgeText} numberOfLines={1}>
                          {getStayDisplayName(stay)}
                        </Text>
                        {stay.guest_count > 0 && (
                          <FontAwesome
                            name="users"
                            size={8}
                            color="#1e293b"
                            style={{ marginLeft: 2 }}
                          />
                        )}
                      </TouchableOpacity>
                    ))}

                    {/* Events (amber colored) */}
                    {dayItems.stays.length < 3 &&
                      dayItems.events
                        .slice(0, 3 - dayItems.stays.length)
                        .map((event, i) => (
                          <TouchableOpacity
                            key={`event-${event.id}-${i}`}
                            style={[
                              styles.eventBadge,
                              { backgroundColor: "#fcd34d" },
                            ]}
                            onPress={() => onEventPress?.(event)}
                          >
                            <FontAwesome
                              name="calendar"
                              size={8}
                              color="#78350f"
                            />
                            <Text
                              style={styles.eventBadgeText}
                              numberOfLines={1}
                            >
                              {event.name}
                            </Text>
                          </TouchableOpacity>
                        ))}

                    {/* +X more indicator */}
                    {remainingCount > 0 && (
                      <Text
                        style={[styles.moreText, { color: colors.foreground }]}
                      >
                        +{remainingCount} more
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={[styles.legend, { borderTopColor: colors.border }]}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: STAY_COLORS[0] }]}
          />
          <Text style={[styles.legendText, { color: colors.foreground }]}>
            Stays
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#fcd34d" }]} />
          <Text style={[styles.legendText, { color: colors.foreground }]}>
            Events
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerCenter: {
    alignItems: "center",
  },
  navButton: {
    padding: 8,
  },
  monthYear: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  todayButton: {
    marginTop: 4,
  },
  todayText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
  weekDays: {
    flexDirection: "row",
    paddingHorizontal: 8,
  },
  weekDayCell: {
    width: DAY_WIDTH,
    alignItems: "center",
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  calendarGrid: {
    flex: 1,
  },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  dayCell: {
    width: DAY_WIDTH,
    minHeight: 70,
    borderWidth: 0.5,
    padding: 2,
  },
  otherMonthCell: {
    opacity: 0.4,
  },
  dayCellContent: {
    flex: 1,
  },
  dateNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
  },
  itemsContainer: {
    marginTop: 2,
    gap: 1,
  },
  stayBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
  },
  stayBadgeText: {
    fontSize: 8,
    color: "#1e293b",
    fontFamily: typography.fontFamily.chillax,
    flex: 1,
  },
  eventBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    gap: 2,
  },
  eventBadgeText: {
    fontSize: 8,
    color: "#78350f",
    fontFamily: typography.fontFamily.chillax,
    flex: 1,
  },
  moreText: {
    fontSize: 8,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 1,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
});
