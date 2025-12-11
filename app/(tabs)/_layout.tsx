import React, { useEffect } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs, router } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useAuth } from "@/lib/context/auth";
import { useColors } from "@/lib/context/theme";
import { useHouse } from "@/lib/context/house";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = useColors();
  const { user, isLoading: authLoading } = useAuth();
  const { houses, isLoading: houseLoading } = useHouse();

  const isLoading = authLoading || houseLoading;

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
          title: "Calendar",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="calendar" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: "Expenses",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="dollar" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bulletin"
        options={{
          title: "Bulletin",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="thumb-tack" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="weather"
        options={{
          title: "Snow",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="snowflake-o" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="broll"
        options={{
          title: "B-Roll",
          tabBarIcon: ({ color }) => <TabBarIcon name="camera" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
