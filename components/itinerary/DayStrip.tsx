import React, { useRef, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/lib/context/theme";
import { typography } from "@/constants/theme";

interface DayStripProps {
  tripStartDate: string;
  tripEndDate?: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
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

const DAY_BUTTON_WIDTH = 56;
const DAY_BUTTON_MARGIN = 4;

export function DayStrip({
  tripStartDate,
  tripEndDate,
  selectedDate,
  onSelectDate,
}: DayStripProps) {
  const colors = useColors();
  const scrollViewRef = useRef<ScrollView>(null);
  const dates = getDateRange(tripStartDate, tripEndDate);

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
