import { getWeatherIcon, getWeatherIconColor } from "@/lib/weather-utils";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

interface WeatherIconProps {
  code: number;
  isDay?: boolean;
  size?: number;
  showBackground?: boolean;
}

export function WeatherIcon({
  code,
  isDay = true,
  size = 24,
  showBackground = false,
}: WeatherIconProps) {
  const iconName = getWeatherIcon(code, isDay);
  const iconColor = getWeatherIconColor(code, isDay);

  if (showBackground) {
    return (
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: `${iconColor}20`,
            width: size * 1.8,
            height: size * 1.8,
            borderRadius: (size * 1.8) / 2,
          },
        ]}
      >
        <FontAwesome name={iconName} size={size} color={iconColor} />
      </View>
    );
  }

  return <FontAwesome name={iconName} size={size} color={iconColor} />;
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});
