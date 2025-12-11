import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase/client";
import type {
  Resort,
  OpenMeteoWeatherData,
  OpenMeteoCurrentWeather,
  OpenMeteoHourlyForecast,
  OpenMeteoDailyForecast,
  WeatherReport,
} from "@/types/database";

const WEATHER_CACHE_KEY = "mokki_weather_cache";
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

interface CachedWeather {
  data: OpenMeteoWeatherData;
  timestamp: number;
  resortId: string;
}

/**
 * Get cached weather data if still valid
 */
async function getCachedWeather(resortId: string): Promise<OpenMeteoWeatherData | null> {
  try {
    const cached = await AsyncStorage.getItem(`${WEATHER_CACHE_KEY}_${resortId}`);
    if (!cached) return null;

    const parsed: CachedWeather = JSON.parse(cached);
    const now = Date.now();

    if (now - parsed.timestamp < CACHE_DURATION_MS) {
      return parsed.data;
    }

    // Cache expired, remove it
    await AsyncStorage.removeItem(`${WEATHER_CACHE_KEY}_${resortId}`);
    return null;
  } catch {
    return null;
  }
}

/**
 * Cache weather data
 */
async function cacheWeather(resortId: string, data: OpenMeteoWeatherData): Promise<void> {
  try {
    const cacheEntry: CachedWeather = {
      data,
      timestamp: Date.now(),
      resortId,
    };
    await AsyncStorage.setItem(`${WEATHER_CACHE_KEY}_${resortId}`, JSON.stringify(cacheEntry));
  } catch (error) {
    console.error("Error caching weather:", error);
  }
}

/**
 * Fetch weather data from Open-Meteo API
 */
async function fetchWeatherFromApi(
  latitude: number,
  longitude: number,
  elevation?: number | null
): Promise<OpenMeteoWeatherData | null> {
  try {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      current: [
        "temperature_2m",
        "apparent_temperature",
        "precipitation",
        "snowfall",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
        "weather_code",
        "cloud_cover",
        "is_day",
        "snow_depth",
        "freezing_level_height",
        "uv_index",
      ].join(","),
      hourly: [
        "temperature_2m",
        "precipitation_probability",
        "precipitation",
        "snowfall",
        "weather_code",
      ].join(","),
      daily: [
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "snowfall_sum",
        "precipitation_probability_max",
        "weather_code",
        "sunshine_duration",
        "sunrise",
        "sunset",
        "uv_index_max",
      ].join(","),
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      precipitation_unit: "inch",
      timezone: "auto",
      forecast_days: "7",
      forecast_hours: "24",
    });

    // Add elevation if available (convert feet to meters)
    if (elevation) {
      params.append("elevation", Math.round(elevation * 0.3048).toString());
    }

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform API response to our types
    const current: OpenMeteoCurrentWeather = {
      temperature: data.current.temperature_2m,
      apparent_temperature: data.current.apparent_temperature,
      precipitation: data.current.precipitation,
      snowfall: data.current.snowfall,
      wind_speed: data.current.wind_speed_10m,
      wind_direction: data.current.wind_direction_10m,
      wind_gusts: data.current.wind_gusts_10m,
      weather_code: data.current.weather_code,
      cloud_cover: data.current.cloud_cover,
      is_day: data.current.is_day === 1,
      snow_depth: (data.current.snow_depth || 0) * 39.37, // meters to inches
      freezing_level: Math.round((data.current.freezing_level_height || 0) * 3.281), // meters to feet
      uv_index: data.current.uv_index || 0,
    };

    const hourly: OpenMeteoHourlyForecast = {
      time: data.hourly.time.slice(0, 24),
      temperature: data.hourly.temperature_2m.slice(0, 24),
      precipitation_probability: data.hourly.precipitation_probability.slice(0, 24),
      precipitation: data.hourly.precipitation.slice(0, 24),
      snowfall: data.hourly.snowfall.slice(0, 24),
      weather_code: data.hourly.weather_code.slice(0, 24),
    };

    const daily: OpenMeteoDailyForecast = {
      time: data.daily.time,
      temperature_max: data.daily.temperature_2m_max,
      temperature_min: data.daily.temperature_2m_min,
      precipitation_sum: data.daily.precipitation_sum,
      snowfall_sum: data.daily.snowfall_sum,
      precipitation_probability_max: data.daily.precipitation_probability_max,
      weather_code: data.daily.weather_code,
      sunshine_duration: data.daily.sunshine_duration,
      sunrise: data.daily.sunrise,
      sunset: data.daily.sunset,
      uv_index_max: data.daily.uv_index_max,
    };

    return { current, hourly, daily };
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
}

/**
 * Get weather for a specific resort
 */
export async function getResortWeather(resort: Resort): Promise<{
  weather: OpenMeteoWeatherData | null;
  error: Error | null;
}> {
  try {
    // Check cache first
    const cached = await getCachedWeather(resort.id);
    if (cached) {
      return { weather: cached, error: null };
    }

    // Fetch fresh data
    const weather = await fetchWeatherFromApi(
      resort.latitude,
      resort.longitude,
      resort.elevation_summit
    );

    if (!weather) {
      return { weather: null, error: new Error("Failed to fetch weather data") };
    }

    // Cache the result
    await cacheWeather(resort.id, weather);

    return { weather, error: null };
  } catch (error) {
    console.error("Error getting resort weather:", error);
    return { weather: null, error: error as Error };
  }
}

/**
 * Get weather reports for multiple resorts
 */
export async function getMultipleWeatherReports(resortIds: string[]): Promise<{
  reports: WeatherReport[];
  error: Error | null;
}> {
  try {
    if (resortIds.length === 0) {
      return { reports: [], error: null };
    }

    // Fetch all resorts
    const { data: resorts, error: resortsError } = await supabase
      .from("resorts")
      .select("*")
      .in("id", resortIds);

    if (resortsError) {
      return { reports: [], error: resortsError };
    }

    if (!resorts || resorts.length === 0) {
      return { reports: [], error: null };
    }

    // Fetch weather for each resort in parallel
    const reports: WeatherReport[] = [];

    await Promise.all(
      resorts.map(async (resort) => {
        const { weather } = await getResortWeather(resort);
        if (weather) {
          reports.push({
            resort,
            weather,
            fetchedAt: new Date().toISOString(),
          });
        }
      })
    );

    // Sort by resort name
    reports.sort((a, b) => a.resort.name.localeCompare(b.resort.name));

    return { reports, error: null };
  } catch (error) {
    console.error("Error getting weather reports:", error);
    return { reports: [], error: error as Error };
  }
}

/**
 * Get a single resort by ID
 */
export async function getResort(resortId: string): Promise<{
  resort: Resort | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("resorts")
      .select("*")
      .eq("id", resortId)
      .single();

    if (error) {
      return { resort: null, error };
    }

    return { resort: data, error: null };
  } catch (error) {
    console.error("Error getting resort:", error);
    return { resort: null, error: error as Error };
  }
}

/**
 * Get all available resorts
 */
export async function getAllResorts(): Promise<{
  resorts: Resort[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("resorts")
      .select("*")
      .order("name");

    if (error) {
      return { resorts: [], error };
    }

    return { resorts: data || [], error: null };
  } catch (error) {
    console.error("Error getting resorts:", error);
    return { resorts: [], error: error as Error };
  }
}

/**
 * Clear weather cache for a specific resort or all resorts
 */
export async function clearWeatherCache(resortId?: string): Promise<void> {
  try {
    if (resortId) {
      await AsyncStorage.removeItem(`${WEATHER_CACHE_KEY}_${resortId}`);
    } else {
      // Clear all weather cache keys
      const keys = await AsyncStorage.getAllKeys();
      const weatherKeys = keys.filter((k) => k.startsWith(WEATHER_CACHE_KEY));
      if (weatherKeys.length > 0) {
        await AsyncStorage.multiRemove(weatherKeys);
      }
    }
  } catch (error) {
    console.error("Error clearing weather cache:", error);
  }
}
