import type { FontAwesome } from "@expo/vector-icons";

type IconName = React.ComponentProps<typeof FontAwesome>["name"];

// WMO Weather Codes to descriptions
const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

/**
 * Get human-readable weather description from WMO code
 */
export function getWeatherDescription(code: number): string {
  return WEATHER_CODES[code] || "Unknown";
}

/**
 * Check if weather code indicates snow
 */
export function isSnowWeather(code: number): boolean {
  return [71, 73, 75, 77, 85, 86].includes(code);
}

/**
 * Check if weather code indicates any precipitation
 */
export function isPrecipitationWeather(code: number): boolean {
  return code >= 51;
}

/**
 * Check if weather code indicates clear/sunny conditions
 */
export function isClearWeather(code: number): boolean {
  return code <= 1;
}

/**
 * Get FontAwesome icon name for weather code
 */
export function getWeatherIcon(code: number, isDay: boolean = true): IconName {
  // Clear
  if (code === 0) {
    return isDay ? "sun-o" : "moon-o";
  }

  // Mainly clear / Partly cloudy
  if (code === 1 || code === 2) {
    return isDay ? "cloud" : "cloud";
  }

  // Overcast
  if (code === 3) {
    return "cloud";
  }

  // Fog
  if (code === 45 || code === 48) {
    return "cloud";
  }

  // Drizzle / Rain
  if (code >= 51 && code <= 67) {
    return "tint";
  }

  // Snow
  if (code >= 71 && code <= 77) {
    return "snowflake-o";
  }

  // Rain showers
  if (code >= 80 && code <= 82) {
    return "tint";
  }

  // Snow showers
  if (code >= 85 && code <= 86) {
    return "snowflake-o";
  }

  // Thunderstorm
  if (code >= 95) {
    return "bolt";
  }

  return "cloud";
}

/**
 * Get icon color for weather code
 */
export function getWeatherIconColor(code: number, isDay: boolean = true): string {
  // Clear - yellow/orange
  if (code <= 1) {
    return isDay ? "#f59e0b" : "#6366f1";
  }

  // Partly cloudy
  if (code === 2) {
    return "#9ca3af";
  }

  // Overcast / Fog
  if (code === 3 || code === 45 || code === 48) {
    return "#6b7280";
  }

  // Rain / Drizzle
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return "#3b82f6";
  }

  // Snow
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    return "#60a5fa";
  }

  // Thunderstorm
  if (code >= 95) {
    return "#eab308";
  }

  return "#9ca3af";
}

/**
 * Convert wind direction degrees to compass direction
 */
export function getWindDirection(degrees: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

/**
 * Get UV index description
 */
export function getUVDescription(uvIndex: number): { label: string; color: string } {
  if (uvIndex <= 2) {
    return { label: "Low", color: "#22c55e" };
  }
  if (uvIndex <= 5) {
    return { label: "Moderate", color: "#eab308" };
  }
  if (uvIndex <= 7) {
    return { label: "High", color: "#f97316" };
  }
  if (uvIndex <= 10) {
    return { label: "Very High", color: "#ef4444" };
  }
  return { label: "Extreme", color: "#7c3aed" };
}

/**
 * Format temperature with degree symbol
 */
export function formatTemp(temp: number): string {
  return `${Math.round(temp)}°`;
}

/**
 * Format snowfall amount
 */
export function formatSnowfall(inches: number): string {
  if (inches === 0) return "0\"";
  if (inches < 0.1) return "<0.1\"";
  return `${inches.toFixed(1)}"`;
}

/**
 * Format time from ISO string to hour (e.g., "3 PM")
 */
export function formatHour(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12} ${ampm}`;
}

/**
 * Format date for forecast display (e.g., "Mon 12/25")
 */
export function formatForecastDate(dateString: string): { day: string; date: string } {
  const date = new Date(dateString + "T12:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    day: days[date.getDay()],
    date: `${date.getMonth() + 1}/${date.getDate()}`,
  };
}

/**
 * Check if conditions indicate a "bluebird day" (clear, sunny, low clouds)
 */
export function isBluebirdDay(
  sunshineDuration: number,
  cloudCover: number
): boolean {
  // Sunshine duration is in seconds, compare to 8 hours (28800 seconds)
  const sunshinePercent = (sunshineDuration / 28800) * 100;
  return sunshinePercent > 60 && cloudCover < 25;
}

/**
 * Calculate total snowfall from daily forecast
 */
export function calculateTotalSnowfall(snowfallArray: number[], days: number = 7): number {
  return snowfallArray.slice(0, days).reduce((sum, val) => sum + (val || 0), 0);
}
