import { GeometricBackground } from "@/components/GeometricBackground";
import { TopBar } from "@/components/TopBar";
import { TripTimer } from "@/components/TripTimer";
import { WeatherIcon } from "@/components/weather";
import { FEATURE_ROUTES } from "@/constants/features";
import { darkColors, lightColors, typography } from "@/constants/theme";
import { getResort, getResortWeather } from "@/lib/api/weather";
import { useAuth } from "@/lib/context/auth";
import { useChat } from "@/lib/context/chat";
import { useHouse } from "@/lib/context/house";
import { useColors, useTheme } from "@/lib/context/theme";
import { getEnabledFeatures, getFeatureLabel } from "@/lib/utils/features";
import type { HouseSettings, OpenMeteoCurrentWeather } from "@/types/database";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInRight,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface LiveClockProps {
  color: string;
  weather?: OpenMeteoCurrentWeather | null;
}

function LiveClock({ color, weather }: LiveClockProps) {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return null;

  const formatTime = (date: Date) => {
    return date
      .toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <View style={styles.clockRow}>
      <Text style={[styles.clockText, { color }]}>
        {formatDate(time)} · {formatTime(time)}
      </Text>
      {weather && (
        <>
          <Text style={[styles.clockText, { color }]}> · </Text>
          <Animated.View
            entering={SlideInRight.duration(400).delay(400)}
            style={styles.weatherContainer}
          >
            <WeatherIcon
              code={weather.weather_code}
              isDay={weather.is_day}
              size={14}
            />
            <Text style={[styles.clockText, { color }]}>
              {Math.round(weather.temperature)}°F
            </Text>
          </Animated.View>
        </>
      )}
    </View>
  );
}

// Get responsive font size based on house name length
function getHouseNameSize(name: string): number {
  const len = name.length;
  // text-7xl = 72px on mobile in web app
  if (len <= 6) return 72;
  if (len <= 12) return 56;
  if (len <= 16) return 48;
  if (len <= 20) return 40;
  return 32;
}

export default function HomeScreen() {
  const { signOut } = useAuth();
  const colors = useColors();
  const { isDark, houseTheme } = useTheme();
  const { activeHouse, isLoading } = useHouse();
  const { unreadHouseChat } = useChat();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [currentWeather, setCurrentWeather] =
    useState<OpenMeteoCurrentWeather | null>(null);

  // Check if using solid background (no mountains)
  const isSolidBackground = houseTheme?.backgroundPattern === "none";

  // Link text color:
  // - With mountains: cream in light mode, dark in dark mode (contrast against mountain)
  // - Solid background: use foreground color (contrast against solid background)
  const linkTextColor = isSolidBackground
    ? colors.foreground
    : isDark
      ? darkColors.background
      : lightColors.background;

  // Generate dynamic links based on house feature settings
  const houseSettings = activeHouse?.settings as HouseSettings | undefined;
  const tripTimer = houseSettings?.tripTimer;
  const showTripTimer = tripTimer?.enabled && tripTimer?.startDate;

  const links = useMemo(() => {
    return getEnabledFeatures(houseSettings).map((featureId) => ({
      href: FEATURE_ROUTES[featureId],
      label: getFeatureLabel(houseSettings, featureId),
    }));
  }, [houseSettings]);

  // Fetch weather for the linked resort
  useEffect(() => {
    let mounted = true;

    const fetchWeather = async () => {
      if (!activeHouse?.resort_id) {
        if (mounted) setCurrentWeather(null);
        return;
      }

      try {
        const { resort } = await getResort(activeHouse.resort_id);
        if (resort && mounted) {
          const { weather } = await getResortWeather(resort);
          if (weather && mounted) {
            setCurrentWeather(weather.current);
          }
        }
      } catch (error) {
        console.error("Error fetching weather for home:", error);
      }
    };

    fetchWeather();

    return () => {
      mounted = false;
    };
  }, [activeHouse?.resort_id]);

  // Get house name from context, or use fallback
  const houseName = activeHouse?.name || "MÖKKI";

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.loadingHeader, { color: colors.foreground }]}>
          MÖKKI
        </Text>
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GeometricBackground />

      {/* Top Bar with house switcher */}
      <TopBar />

      <View
        style={[
          styles.content,
          {
            paddingBottom: insets.bottom + 40,
          },
        ]}
      >
        {/* Header Section - House Name & Clock */}
        <View style={styles.header}>
          <Animated.Text
            entering={FadeInDown.duration(500)}
            style={[
              styles.houseName,
              {
                color: colors.red,
                fontSize: getHouseNameSize(houseName),
              },
            ]}
          >
            {houseName}
          </Animated.Text>

          <Animated.View
            entering={FadeIn.delay(400).duration(500)}
            style={styles.clockContainer}
          >
            <LiveClock color={colors.foreground} weather={currentWeather} />
          </Animated.View>

          {/* Trip Timer - countdown or day counter */}
          {showTripTimer && (
            <TripTimer
              startDate={tripTimer.startDate}
              endDate={tripTimer.endDate}
              color={colors.foreground}
            />
          )}
        </View>

        {/* Navigation Links - Centered vertically, stacked in column */}
        <View style={styles.linksContainer}>
          {links.map((link, index) => {
            const isChatLink = link.href.includes("chat");
            const showUnreadDot = isChatLink && unreadHouseChat > 0;

            return (
              <TouchableOpacity
                key={link.href}
                onPress={() => router.push(link.href as any)}
                style={styles.linkButton}
                activeOpacity={0.7}
              >
                <View style={styles.linkRow}>
                  <Text style={[styles.linkText, { color: linkTextColor }]}>
                    {link.label}
                  </Text>
                  {showUnreadDot && (
                    <View
                      style={[
                        styles.unreadDot,
                        { backgroundColor: colors.red },
                      ]}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Temporary Sign Out - remove later */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingHeader: {
    fontSize: 24,
    fontFamily: typography.fontFamily.chillaxBold,
    marginBottom: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginTop: 26,
  },
  houseName: {
    fontFamily: typography.fontFamily.chillaxBold,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1,
    lineHeight: 60,
  },
  clockContainer: {
    marginTop: 2,
  },
  clockRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  clockText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  weatherContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  linksContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // Position links in the mountain area (lower half of screen)
    marginTop: SCREEN_HEIGHT * 0.14,
  },
  linkButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  linkText: {
    fontSize: 32,
    fontFamily: typography.fontFamily.boskaMedium,
    textTransform: "uppercase",
    textAlign: "center",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    alignItems: "center",
    paddingBottom: 10,
  },
  signOutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
});
