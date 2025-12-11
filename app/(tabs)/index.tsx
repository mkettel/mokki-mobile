import { useState, useEffect } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/context/auth";
import { useColors } from "@/lib/context/theme";
import { GeometricBackground } from "@/components/GeometricBackground";
import { typography } from "@/constants/theme";
import Animated, {
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

// Navigation links matching web app
const links = [
  { href: "/(tabs)/calendar", label: "Reserve your bed", row: 1 },
  { href: "/(tabs)/expenses", label: "Pay up", row: 1 },
  { href: "/(tabs)/b-roll", label: "B-roll", row: 2 },
  { href: "/(tabs)/account", label: "About you", row: 2 },
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
  if (len <= 6) return 72;
  if (len <= 12) return 60;
  if (len <= 16) return 48;
  if (len <= 20) return 40;
  return 32;
}

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // TODO: Replace with actual house name from context/API
  const houseName = "MÖKKI";

  const row1Links = links.filter((l) => l.row === 1);
  const row2Links = links.filter((l) => l.row === 2);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GeometricBackground />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        {/* House Name Header */}
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

        {/* Navigation Links */}
        <View style={styles.linksContainer}>
          {/* Row 1 */}
          <View style={styles.linkRow}>
            {row1Links.map((link, index) => (
              <Animated.View
                key={link.label}
                entering={FadeInDown.delay(400 + index * 100).duration(400)}
              >
                <TouchableOpacity
                  onPress={() => router.push(link.href as any)}
                  style={styles.linkButton}
                >
                  <Text
                    style={[
                      styles.linkText,
                      { color: colors.background },
                    ]}
                  >
                    {link.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>

          {/* Row 2 */}
          <View style={styles.linkRow}>
            {row2Links.map((link, index) => (
              <Animated.View
                key={link.label}
                entering={FadeInDown.delay(600 + index * 100).duration(400)}
              >
                <TouchableOpacity
                  onPress={() => router.push(link.href as any)}
                  style={styles.linkButton}
                >
                  <Text
                    style={[
                      styles.linkText,
                      { color: colors.background },
                    ]}
                  >
                    {link.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Sign Out Button - temporary for testing */}
        <Animated.View
          entering={FadeIn.delay(800).duration(400)}
          style={styles.footer}
        >
          <TouchableOpacity
            style={[styles.signOutButton, { borderColor: colors.foreground }]}
            onPress={signOut}
          >
            <Text style={[styles.signOutText, { color: colors.foreground }]}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
  },
  houseName: {
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  clockContainer: {
    marginTop: 8,
  },
  clockText: {
    fontSize: 14,
  },
  linksContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
    maxWidth: 500,
    alignSelf: "center",
    width: "100%",
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  linkButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  linkText: {
    fontSize: width > 400 ? 32 : 26,
    fontFamily: typography.fontFamily.boskaMedium,
    textTransform: "uppercase",
  },
  footer: {
    alignItems: "center",
    paddingBottom: 20,
  },
  signOutButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
