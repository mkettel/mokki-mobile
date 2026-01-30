import React, { useRef, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useColors } from "@/lib/context/theme";
import { typography } from "@/constants/theme";

interface DayStripProps {
  tripStartDate: string;
  tripEndDate?: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  isAdmin?: boolean;
  onChangeDates?: () => void;
  // Session booking props
  sessionBookingEnabled?: boolean;
  sessionBookingLabel?: string;
  onBookSession?: () => void;
}

// Parse a YYYY-MM-DD string as local date
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Format date as YYYY-MM-DD
function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Get all dates between start and end (inclusive)
function getDateRange(startDate: string, endDate?: string): string[] {
  const start = parseLocalDate(startDate);
  const end = endDate ? parseLocalDate(endDate) : start;
  const dates: string[] = [];

  const current = new Date(start);
  while (current <= end) {
    dates.push(formatDateString(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// Check if a date is today
function isToday(dateString: string): boolean {
  const today = formatDateString(new Date());
  return dateString === today;
}

// Format date for display (e.g., "Fri 14")
function formatDayDisplay(dateString: string): { dayName: string; dayNum: string } {
  const date = parseLocalDate(dateString);
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
  const dayNum = String(date.getDate());
  return { dayName, dayNum };
}

// Format date range for header display (e.g., "Jan 15 - 22" or "Jan 28 - Feb 2")
function formatDateRange(startDate: string, endDate?: string): string {
  const start = parseLocalDate(startDate);
  const end = endDate ? parseLocalDate(endDate) : start;

  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (!endDate || startDate === endDate) {
    return `${startMonth} ${startDay}`;
  }

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}`;
  }

  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

const DAY_BUTTON_WIDTH = 56;
const DAY_BUTTON_MARGIN = 4;

export function DayStrip({
  tripStartDate,
  tripEndDate,
  selectedDate,
  onSelectDate,
  isAdmin,
  onChangeDates,
  sessionBookingEnabled,
  sessionBookingLabel,
  onBookSession,
}: DayStripProps) {
  const colors = useColors();
  const scrollViewRef = useRef<ScrollView>(null);
  const dates = getDateRange(tripStartDate, tripEndDate);
  const dateRangeText = formatDateRange(tripStartDate, tripEndDate);

  // Scroll to selected date on mount and when it changes
  useEffect(() => {
    const selectedIndex = dates.indexOf(selectedDate);
    if (selectedIndex !== -1 && scrollViewRef.current) {
      // Calculate scroll position to center the selected date
      const scrollX = selectedIndex * (DAY_BUTTON_WIDTH + DAY_BUTTON_MARGIN * 2) - 100;
      scrollViewRef.current.scrollTo({ x: Math.max(0, scrollX), animated: true });
    }
  }, [selectedDate, dates]);

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      {/* Date Range Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.dateRangeText, { color: colors.foreground }]}>
          {dateRangeText}
        </Text>
        <View style={styles.headerButtons}>
          {/* Book Session Button - visible to all when enabled */}
          {sessionBookingEnabled && onBookSession && (
            <TouchableOpacity
              style={[styles.bookSessionButton, { backgroundColor: colors.primary }]}
              onPress={onBookSession}
            >
              <FontAwesome name="calendar-plus-o" size={12} color={colors.primaryForeground} />
              <Text style={[styles.bookSessionText, { color: colors.primaryForeground }]}>
                {sessionBookingLabel || "Book Session"}
              </Text>
            </TouchableOpacity>
          )}
          {/* Change Dates Button - admin only */}
          {isAdmin && onChangeDates && (
            <TouchableOpacity
              style={[styles.changeDatesButton, { backgroundColor: colors.muted }]}
              onPress={onChangeDates}
            >
              <Text style={[styles.changeDatesText, { color: colors.mutedForeground }]}>
                Change dates
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {dates.map((dateString) => {
          const { dayName, dayNum } = formatDayDisplay(dateString);
          const isSelected = dateString === selectedDate;
          const isTodayDate = isToday(dateString);

          return (
            <TouchableOpacity
              key={dateString}
              style={[
                styles.dayButton,
                {
                  backgroundColor: isSelected ? colors.primary : "transparent",
                  borderColor: isTodayDate && !isSelected ? colors.primary : "transparent",
                },
              ]}
              onPress={() => onSelectDate(dateString)}
            >
              <Text
                style={[
                  styles.dayName,
                  {
                    color: isSelected
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                  },
                ]}
              >
                {dayName}
              </Text>
              <Text
                style={[
                  styles.dayNum,
                  {
                    color: isSelected
                      ? colors.primaryForeground
                      : colors.foreground,
                  },
                ]}
              >
                {dayNum}
              </Text>
              {isTodayDate && (
                <View
                  style={[
                    styles.todayDot,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryForeground
                        : colors.primary,
                    },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  dateRangeText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bookSessionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 5,
  },
  bookSessionText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  changeDatesButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  changeDatesText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  scrollContent: {
    paddingHorizontal: 12,
  },
  dayButton: {
    width: DAY_BUTTON_WIDTH,
    paddingVertical: 8,
    marginHorizontal: DAY_BUTTON_MARGIN,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
  },
  dayName: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
    marginBottom: 2,
  },
  dayNum: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});
