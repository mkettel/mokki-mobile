import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import {
  formatHour,
  formatSnowfall,
  formatTemp,
  isSnowWeather,
} from "@/lib/weather-utils";
import type { OpenMeteoHourlyForecast } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { WeatherIcon } from "./WeatherIcon";

interface HourlyForecastProps {
  hourly: OpenMeteoHourlyForecast;
}

export function HourlyForecast({ hourly }: HourlyForecastProps) {
  const colors = useColors();

  // Calculate summary stats
  const temps = hourly.temperature;
  const highTemp = Math.max(...temps);
  const lowTemp = Math.min(...temps);
  const totalSnow = hourly.snowfall.reduce((sum, val) => sum + (val || 0), 0);
  const hasSnow = totalSnow > 0;

  // Get current hour index (approximate)
  const currentHour = new Date().getHours();

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <FontAwesome name="clock-o" size={14} color={colors.foreground} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            24-Hour Forecast
          </Text>
        </View>
        {hasSnow && (
          <View style={[styles.snowAlert, { backgroundColor: "#dbeafe" }]}>
            <FontAwesome name="snowflake-o" size={10} color="#2563eb" />
            <Text style={styles.snowAlertText}>
              {formatSnowfall(totalSnow)} expected
            </Text>
          </View>
        )}
      </View>

      {/* Summary row */}
      <View style={[styles.summaryRow, { borderBottomColor: colors.border }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
            High
          </Text>
          <Text style={[styles.summaryValue, { color: "#ef4444" }]}>
            {formatTemp(highTemp)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
            Low
          </Text>
          <Text style={[styles.summaryValue, { color: "#3b82f6" }]}>
            {formatTemp(lowTemp)}
          </Text>
        </View>
        {hasSnow && (
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              Total Snow
            </Text>
            <Text style={[styles.summaryValue, { color: "#60a5fa" }]}>
              {formatSnowfall(totalSnow)}
            </Text>
          </View>
        )}
      </View>

      {/* Hourly scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {hourly.time.map((time, index) => {
          const isCurrentHour = index === 0; // First item is now
          const isSnowHour = isSnowWeather(hourly.weather_code[index]);
          const snowAmount = hourly.snowfall[index] || 0;

          return (
            <View
              key={time}
              style={[
                styles.hourItem,
                isSnowHour && styles.snowHourItem,
                isCurrentHour && [styles.currentHourItem, { borderColor: colors.primary }],
              ]}
            >
              <Text
                style={[
                  styles.hourTime,
                  { color: isCurrentHour ? colors.primary : colors.mutedForeground },
                ]}
              >
                {isCurrentHour ? "Now" : formatHour(time)}
              </Text>

              <WeatherIcon
                code={hourly.weather_code[index]}
                isDay={true}
                size={20}
              />

              <Text style={[styles.hourTemp, { color: colors.foreground }]}>
                {formatTemp(hourly.temperature[index])}
              </Text>

              {/* Precipitation probability */}
              <View style={styles.precipRow}>
                <FontAwesome
                  name="tint"
                  size={10}
                  color={colors.mutedForeground}
                />
                <Text style={[styles.precipText, { color: colors.mutedForeground }]}>
                  {hourly.precipitation_probability[index]}%
                </Text>
              </View>

              {/* Snow amount if any */}
              {snowAmount > 0 && (
                <Text style={styles.snowText}>
                  {formatSnowfall(snowAmount)}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>
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
    paddingBottom: 8,
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
  snowAlert: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  snowAlertText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillaxMedium,
    color: "#2563eb",
  },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    gap: 24,
  },
  summaryItem: {
    alignItems: "center",
    gap: 2,
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillax,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
    gap: 4,
  },
  hourItem: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    minWidth: 60,
  },
  snowHourItem: {
    backgroundColor: "rgba(96, 165, 250, 0.1)",
  },
  currentHourItem: {
    borderWidth: 2,
  },
  hourTime: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  hourTemp: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  precipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  precipText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillax,
  },
  snowText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillaxMedium,
    color: "#60a5fa",
  },
});
