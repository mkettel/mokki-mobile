import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/lib/context/theme";
import { typography } from "@/constants/theme";

interface NowIndicatorProps {
  hourHeight: number;
  startHour: number;
}

// Get position of current time within the timeline
function getCurrentTimePosition(hourHeight: number, startHour: number): number {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const totalMinutes = (hours - startHour) * 60 + minutes;
  return (totalMinutes / 60) * hourHeight;
}

// Format current time (e.g., "12:34 PM")
function formatCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function NowIndicator({ hourHeight, startHour }: NowIndicatorProps) {
  const colors = useColors();
  const [position, setPosition] = useState(() =>
    getCurrentTimePosition(hourHeight, startHour)
  );
  const [timeLabel, setTimeLabel] = useState(formatCurrentTime);

  // Update position every minute
  useEffect(() => {
    const updateTime = () => {
      setPosition(getCurrentTimePosition(hourHeight, startHour));
      setTimeLabel(formatCurrentTime());
    };

    // Update immediately
    updateTime();

    // Update every minute
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, [hourHeight, startHour]);

  // Don't show if position is negative (before start hour)
  if (position < 0) return null;

  return (
    <View style={[styles.container, { top: position }]}>
      <View style={[styles.labelContainer, { backgroundColor: colors.destructive }]}>
        <Text style={[styles.label, { color: "#fff" }]}>{timeLabel}</Text>
      </View>
      <View style={[styles.line, { backgroundColor: colors.destructive }]} />
      <View style={[styles.dot, { backgroundColor: colors.destructive }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 100,
  },
  labelContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  label: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  line: {
    flex: 1,
    height: 2,
    marginLeft: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
});
