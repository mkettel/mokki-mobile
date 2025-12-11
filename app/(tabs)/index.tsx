import { GeometricBackground } from "@/components/GeometricBackground";
import { TopBar } from "@/components/TopBar";
import { typography } from "@/constants/theme";
import { useAuth } from "@/lib/context/auth";
import { useHouse } from "@/lib/context/house";
import { useColors } from "@/lib/context/theme";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Navigation links matching web app exactly
const links = [
  { href: "/(tabs)/calendar", label: "Reserve your bed" },
  { href: "/(tabs)/weather", label: "Pow report" },
  { href: "/(tabs)/broll", label: "B-roll" },
  { href: "/(tabs)/bulletin", label: "Bulletin board" },
  { href: "/(tabs)/expenses", label: "Pay up" },
  { href: "/members", label: "Who's who" },
  { href: "/(tabs)/account", label: "About you" },
];

function LiveClock({ color }: { color: string }) {
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
    <Text style={[styles.clockText, { color }]}>
      {formatDate(time)} · {formatTime(time)}
    </Text>
  );
}

// Get responsive font size based on house name length
function getHouseNameSize(name: string): number {
  const len = name.length;
  // text-7xl = 72px on mobile in web app
  if (len <= 6) return 72;
  if (len <= 12) return 60;
  if (len <= 16) return 48;
  if (len <= 20) return 40;
  return 32;
}

export default function HomeScreen() {
  const { signOut } = useAuth();
  const colors = useColors();
  const { activeHouse, isLoading } = useHouse();
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
            <LiveClock color={colors.foreground} />
          </Animated.View>
        </View>

        {/* Navigation Links - Centered vertically, stacked in column */}
        <View style={styles.linksContainer}>
          {links.map((link, index) => (
            <TouchableOpacity
              key={link.label}
              onPress={() => router.push(link.href as any)}
              style={styles.linkButton}
              activeOpacity={0.7}
            >
              <Text style={[styles.linkText, { color: colors.foreground }]}>
                {link.label}
              </Text>
            </TouchableOpacity>
          ))}
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginTop: 10,
  },
  houseName: {
    fontFamily: typography.fontFamily.chillaxBold,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  clockContainer: {
    marginTop: 2,
  },
  clockText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
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
  linkText: {
    fontSize: 28,
    fontFamily: typography.fontFamily.boskaMedium,
    textTransform: "uppercase",
    textAlign: "center",
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
