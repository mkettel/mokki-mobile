import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import { AuthProvider } from "@/lib/context/auth";
import { ThemeProvider } from "@/lib/context/theme";
import { HouseProvider } from "@/lib/context/house";
import { PresenceProvider } from "@/lib/context/presence";
import { ChatProvider } from "@/lib/context/chat";
import { NotificationsProvider } from "@/lib/context/notifications";
import { lightColors, darkColors } from "@/constants/theme";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(auth)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Custom navigation theme to match Mokki colors
const MokkiLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: lightColors.primary,
    background: lightColors.background,
    card: lightColors.card,
    text: lightColors.foreground,
    border: lightColors.border,
    notification: lightColors.destructive,
  },
};

const MokkiDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: darkColors.primary,
    background: darkColors.background,
    card: darkColors.card,
    text: darkColors.foreground,
    border: darkColors.border,
    notification: darkColors.destructive,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    // Chillax - main UI font (sans-serif)
    "Chillax-Regular": require("../assets/fonts/Chillax-Regular.otf"),
    "Chillax-Medium": require("../assets/fonts/Chillax-Medium.otf"),
    "Chillax-Semibold": require("../assets/fonts/Chillax-Semibold.otf"),
    "Chillax-Bold": require("../assets/fonts/Chillax-Bold.otf"),
    // Boska - navigation links font (serif)
    "Boska-Regular": require("../assets/fonts/Boska-Regular.otf"),
    "Boska-Medium": require("../assets/fonts/Boska-Medium.otf"),
    "Boska-Bold": require("../assets/fonts/Boska-Bold.otf"),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <HouseProvider>
          <PresenceProvider>
            <ChatProvider>
              <NotificationsProvider>
                <RootLayoutNav />
              </NotificationsProvider>
            </ChatProvider>
          </PresenceProvider>
        </HouseProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <NavigationThemeProvider
      value={colorScheme === "dark" ? MokkiDarkTheme : MokkiLightTheme}
    >
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="create-house" options={{ headerShown: false }} />
        <Stack.Screen name="house-settings" options={{ headerShown: false }} />
        <Stack.Screen name="members" options={{ headerShown: false }} />
        <Stack.Screen name="bed-history" options={{ headerShown: false }} />
        <Stack.Screen name="room-configuration" options={{ headerShown: false }} />
        <Stack.Screen name="invite/[code]" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[conversationId]" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </NavigationThemeProvider>
  );
}
