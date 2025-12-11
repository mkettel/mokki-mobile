import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import {
  calculateTotalSnowfall,
  formatSnowfall,
  formatTemp,
  getWeatherDescription,
} from "@/lib/weather-utils";
import type { WeatherReport } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WeatherIcon } from "./WeatherIcon";

interface ResortWeatherCardProps {
  report: WeatherReport;
  onPress?: () => void;
  isSelected?: boolean;
}

export function ResortWeatherCard({
  report,
  onPress,
  isSelected = false,
}: ResortWeatherCardProps) {
  const colors = useColors();
  const { resort, weather } = report;
  const { current, daily } = weather;

  const totalSnow3Day = calculateTotalSnowfall(daily.snowfall_sum, 3);
  const totalSnow7Day = calculateTotalSnowfall(daily.snowfall_sum, 7);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: isSelected ? colors.primary : colors.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.resortInfo}>
          <Text
            style={[styles.resortName, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {resort.name}
          </Text>
          <Text style={[styles.condition, { color: colors.mutedForeground }]}>
            {getWeatherDescription(current.weather_code)}
          </Text>
        </View>
        <View style={styles.tempContainer}>
          <WeatherIcon
            code={current.weather_code}
            isDay={current.is_day}
            size={24}
          />
          <Text style={[styles.temperature, { color: colors.foreground }]}>
            {formatTemp(current.temperature)}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <FontAwesome name="asterisk" size={10} color="#60a5fa" />
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Now
          </Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {formatSnowfall(current.snowfall)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <FontAwesome name="calendar" size={10} color="#60a5fa" />
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            3-Day
          </Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {formatSnowfall(totalSnow3Day)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <FontAwesome name="calendar-o" size={10} color="#60a5fa" />
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            7-Day
          </Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {formatSnowfall(totalSnow7Day)}
          </Text>
        </View>

        <View style={styles.statItem}>
          <FontAwesome name="leaf" size={10} color={colors.mutedForeground} />
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Wind
          </Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {Math.round(current.wind_speed)} mph
          </Text>
        </View>
      </View>

      {/* Mini forecast bar */}
      <View style={styles.miniForecast}>
        {daily.snowfall_sum.slice(0, 7).map((snow, index) => {
          const hasSnow = snow > 0;
          const maxSnow = Math.max(...daily.snowfall_sum, 1);
          const barHeight = Math.max((snow / maxSnow) * 16, hasSnow ? 2 : 0);

          return (
            <View key={index} style={styles.miniBarContainer}>
              <View
                style={[
                  styles.miniBar,
                  {
                    height: barHeight,
                    backgroundColor: hasSnow ? "#60a5fa" : colors.border,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>

      {/* Elevation info */}
      {resort.elevation_summit && (
        <View style={styles.elevationRow}>
          <FontAwesome name="arrow-up" size={10} color={colors.mutedForeground} />
          <Text style={[styles.elevationText, { color: colors.mutedForeground }]}>
            Summit: {resort.elevation_summit.toLocaleString()} ft
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  resortInfo: {
    flex: 1,
    marginRight: 12,
  },
  resortName: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  condition: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  tempContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  temperature: {
    fontSize: 24,
    fontFamily: typography.fontFamily.chillaxBold,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statItem: {
    alignItems: "center",
    gap: 2,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillax,
  },
  statValue: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  miniForecast: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: 20,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  miniBarContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 2,
  },
  miniBar: {
    width: "100%",
    maxWidth: 20,
    borderRadius: 2,
    minHeight: 0,
  },
  elevationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  elevationText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
  },
});
