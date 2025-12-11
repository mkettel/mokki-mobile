import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import {
  calculateTotalSnowfall,
  formatForecastDate,
  formatSnowfall,
  formatTemp,
} from "@/lib/weather-utils";
import type { OpenMeteoDailyForecast } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { WeatherIcon } from "./WeatherIcon";

interface SnowForecastProps {
  daily: OpenMeteoDailyForecast;
}

export function SnowForecast({ daily }: SnowForecastProps) {
  const colors = useColors();
  const totalSnow = calculateTotalSnowfall(daily.snowfall_sum);
  const maxSnow = Math.max(...daily.snowfall_sum, 1); // At least 1 for scaling

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <FontAwesome name="snowflake-o" size={14} color="#60a5fa" />
          <Text style={[styles.title, { color: colors.foreground }]}>
            7-Day Snow Forecast
          </Text>
        </View>
        <View style={[styles.totalBadge, { backgroundColor: "#dbeafe" }]}>
          <Text style={styles.totalText}>
            {formatSnowfall(totalSnow)} total
          </Text>
        </View>
      </View>

      {/* Daily forecast grid */}
      <View style={styles.forecastGrid}>
        {daily.time.map((date, index) => {
          const snowfall = daily.snowfall_sum[index] || 0;
          const hasSnow = snowfall > 0;
          const { day, date: dateStr } = formatForecastDate(date);
          const barHeight = Math.max((snowfall / maxSnow) * 40, hasSnow ? 4 : 0);

          return (
            <View
              key={date}
              style={[
                styles.dayItem,
                index === 0 && styles.todayItem,
                { borderColor: colors.border },
              ]}
            >
              {/* Day label */}
              <Text
                style={[
                  styles.dayName,
                  { color: index === 0 ? colors.primary : colors.foreground },
                ]}
              >
                {index === 0 ? "Today" : day}
              </Text>
              <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                {dateStr}
              </Text>

              {/* Weather icon */}
              <View style={styles.iconContainer}>
                <WeatherIcon code={daily.weather_code[index]} size={18} />
              </View>

              {/* Snow bar chart */}
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.snowBar,
                    {
                      height: barHeight,
                      backgroundColor: hasSnow ? "#60a5fa" : "transparent",
                    },
                  ]}
                />
              </View>

              {/* Snowfall amount */}
              <Text
                style={[
                  styles.snowAmount,
                  { color: hasSnow ? "#60a5fa" : colors.mutedForeground },
                ]}
              >
                {hasSnow ? formatSnowfall(snowfall) : "—"}
              </Text>

              {/* Temperature range */}
              <View style={styles.tempRange}>
                <Text style={[styles.highTemp, { color: colors.foreground }]}>
                  {formatTemp(daily.temperature_max[index])}
                </Text>
                <Text style={[styles.lowTemp, { color: colors.mutedForeground }]}>
                  {formatTemp(daily.temperature_min[index])}
                </Text>
              </View>

              {/* Precipitation probability */}
              <View style={styles.precipRow}>
                <FontAwesome name="tint" size={10} color={colors.mutedForeground} />
                <Text style={[styles.precipText, { color: colors.mutedForeground }]}>
                  {daily.precipitation_probability_max[index]}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* No snow message */}
      {totalSnow === 0 && (
        <View style={styles.noSnowMessage}>
          <Text style={[styles.noSnowText, { color: colors.mutedForeground }]}>
            No snow in the forecast for the next 7 days
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  totalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  totalText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
    color: "#2563eb",
  },
  forecastGrid: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  dayItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 4,
  },
  todayItem: {
    backgroundColor: "rgba(59, 130, 246, 0.05)",
    borderRadius: 8,
  },
  dayName: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  dateText: {
    fontSize: 9,
    fontFamily: typography.fontFamily.chillax,
  },
  iconContainer: {
    height: 24,
    justifyContent: "center",
    marginVertical: 4,
  },
  barContainer: {
    height: 44,
    width: 16,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  snowBar: {
    width: 12,
    borderRadius: 4,
    minHeight: 0,
  },
  snowAmount: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillaxSemibold,
    marginTop: 4,
  },
  tempRange: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  highTemp: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  lowTemp: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
  },
  precipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  precipText: {
    fontSize: 9,
    fontFamily: typography.fontFamily.chillax,
  },
  noSnowMessage: {
    paddingBottom: 16,
    alignItems: "center",
  },
  noSnowText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    fontStyle: "italic",
  },
});
