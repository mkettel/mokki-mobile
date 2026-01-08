import React, { useEffect } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs, router } from "expo-router";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useAuth } from "@/lib/context/auth";
import { useColors } from "@/lib/context/theme";
import { useHouse } from "@/lib/context/house";
import { useChat } from "@/lib/context/chat";
import { isFeatureEnabled } from "@/lib/utils/features";
import type { FeatureId, HouseSettings } from "@/types/database";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
  badge?: number;
}) {
  const { badge, ...iconProps } = props;
  return (
    <View style={styles.tabIconContainer}>
      <FontAwesome size={24} style={{ marginBottom: -3 }} {...iconProps} />
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badge > 99 ? "99+" : badge}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = useColors();
  const { user, isLoading: authLoading } = useAuth();
  const { activeHouse, houses, isLoading: houseLoading } = useHouse();
  const { unreadHouseChat, unreadDMTotal } = useChat();

  const isLoading = authLoading || houseLoading;

  // Total unread for chat tab badge
  const totalUnread = unreadHouseChat + unreadDMTotal;

  // Get house settings for feature visibility
  const houseSettings = (activeHouse?.settings as HouseSettings) || undefined;

  // Helper to conditionally show/hide tabs based on feature settings
  // Returns undefined to show tab, null to hide it (Expo Router convention)
  const showTab = (featureId: FeatureId) =>
    isFeatureEnabled(houseSettings, featureId) ? undefined : (null as any);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/(auth)/login");
    }
  }, [user, authLoading]);

  // Redirect to create-house if user has no houses
  useEffect(() => {
    if (!isLoading && user && houses.length === 0) {
      router.replace("/create-house");
    }
  }, [user, houses, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  if (!user || houses.length === 0) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          // Hide tab bar on home screen - navigation is in the content
          tabBarStyle: { display: "none" },
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          href: showTab("calendar"),
          title: "Calendar",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="calendar" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="itinerary"
        options={{
          href: showTab("itinerary"),
          title: "Itinerary",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="list-alt" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          href: showTab("expenses"),
          title: "Expenses",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="dollar" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bulletin"
        options={{
          href: showTab("bulletin"),
          title: "Bulletin",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="thumb-tack" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="weather"
        options={{
          href: showTab("weather"),
          title: "Snow",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="snowflake-o" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="broll"
        options={{
          href: showTab("broll"),
          title: "B-Roll",
          tabBarIcon: ({ color }) => <TabBarIcon name="camera" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: showTab("chat"),
          title: "Chat",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="comments" color={color} badge={totalUnread} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          href: showTab("account"),
          title: "Account",
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
});
