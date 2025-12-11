import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import {
  formatSnowfall,
  formatTemp,
  getUVDescription,
  getWeatherDescription,
  getWindDirection,
  isBluebirdDay,
} from "@/lib/weather-utils";
import type { OpenMeteoCurrentWeather, OpenMeteoDailyForecast, Resort } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { WeatherIcon } from "./WeatherIcon";

interface CurrentConditionsCardProps {
  current: OpenMeteoCurrentWeather;
  daily: OpenMeteoDailyForecast;
  resort: Resort;
}

export function CurrentConditionsCard({
  current,
  daily,
  resort,
}: CurrentConditionsCardProps) {
  const colors = useColors();
  const uvInfo = getUVDescription(current.uv_index);
  const todaySunshine = daily.sunshine_duration[0] || 0;
  const isBluebird = isBluebirdDay(todaySunshine, current.cloud_cover);

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Bluebird banner */}
      {isBluebird && (
        <View style={[styles.bluebirdBanner, { backgroundColor: "#dbeafe" }]}>
          <FontAwesome name="sun-o" size={14} color="#2563eb" />
          <Text style={styles.bluebirdText}>Bluebird Day!</Text>
        </View>
      )}

      {/* Main weather display */}
      <View style={styles.mainRow}>
        <View style={styles.tempSection}>
          <WeatherIcon code={current.weather_code} isDay={current.is_day} size={48} />
          <View style={styles.tempInfo}>
            <Text style={[styles.temperature, { color: colors.foreground }]}>
              {formatTemp(current.temperature)}
            </Text>
            <Text style={[styles.feelsLike, { color: colors.mutedForeground }]}>
              Feels like {formatTemp(current.apparent_temperature)}
            </Text>
          </View>
        </View>
        <View style={styles.conditionSection}>
          <Text style={[styles.conditionText, { color: colors.foreground }]}>
            {getWeatherDescription(current.weather_code)}
          </Text>
          <Text style={[styles.resortName, { color: colors.mutedForeground }]}>
            {resort.name}
          </Text>
        </View>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        {/* Wind */}
        <View style={[styles.statItem, { borderColor: colors.border }]}>
          <FontAwesome name="leaf" size={14} color={colors.mutedForeground} />
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {Math.round(current.wind_speed)} mph
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Wind {getWindDirection(current.wind_direction)}
          </Text>
        </View>

        {/* Gusts */}
        <View style={[styles.statItem, { borderColor: colors.border }]}>
          <FontAwesome name="flag" size={14} color={colors.mutedForeground} />
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {Math.round(current.wind_gusts)} mph
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Gusts
          </Text>
        </View>

        {/* Snow Depth */}
        <View style={[styles.statItem, { borderColor: colors.border }]}>
          <FontAwesome name="snowflake-o" size={14} color="#60a5fa" />
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {formatSnowfall(current.snow_depth)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Snow Depth
          </Text>
        </View>

        {/* Current Snowfall */}
        <View style={[styles.statItem, { borderColor: colors.border }]}>
          <FontAwesome name="asterisk" size={14} color="#60a5fa" />
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {formatSnowfall(current.snowfall)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
            Snowfall Now
          </Text>
        </View>
      </View>

      {/* Additional info row */}
      <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
        {/* Freezing Level */}
        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
            Freezing Level
          </Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>
            {current.freezing_level.toLocaleString()} ft
          </Text>
          {resort.elevation_summit && (
            <Text
              style={[
                styles.infoNote,
                {
                  color:
                    current.freezing_level > resort.elevation_summit
                      ? "#f97316"
                      : "#22c55e",
                },
              ]}
            >
              {current.freezing_level > resort.elevation_summit
                ? "Above summit"
                : "Snow likely at summit"}
            </Text>
          )}
        </View>

        {/* UV Index */}
        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
            UV Index
          </Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>
            {current.uv_index.toFixed(1)}
          </Text>
          <Text style={[styles.infoNote, { color: uvInfo.color }]}>
            {uvInfo.label}
          </Text>
        </View>

        {/* Cloud Cover */}
        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
            Cloud Cover
          </Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>
            {current.cloud_cover}%
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
  },
  bluebirdBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 6,
  },
  bluebirdText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
    color: "#2563eb",
  },
  mainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  tempSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tempInfo: {
    gap: 2,
  },
  temperature: {
    fontSize: 36,
    fontFamily: typography.fontFamily.chillaxBold,
  },
  feelsLike: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
  conditionSection: {
    alignItems: "flex-end",
  },
  conditionText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  resortName: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  statItem: {
    width: "50%",
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 0.5,
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
  },
  infoRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  infoItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  infoLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillax,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  infoNote: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillax,
  },
});
