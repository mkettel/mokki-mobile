import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";
import {
  lightColors,
  darkColors,
  ThemeColors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from "@/constants/theme";

type ThemePreference = "light" | "dark" | "system";

type ThemeContextType = {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  isDark: boolean;
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
};

const THEME_STORAGE_KEY = "@mokki_theme";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useRNColorScheme();
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((savedTheme) => {
      if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
        setThemeState(savedTheme as ThemePreference);
      }
      setIsLoaded(true);
    });
  }, []);

  // Save theme preference when it changes
  const setTheme = (newTheme: ThemePreference) => {
    setThemeState(newTheme);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  // Determine if dark mode based on preference
  const isDark =
    theme === "system"
      ? systemColorScheme === "dark"
      : theme === "dark";

  const colors = isDark ? darkColors : lightColors;

  // Don't render until we've loaded the saved preference
  // This prevents a flash of wrong theme
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        isDark,
        colors,
        typography,
        spacing,
        borderRadius,
        shadows,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Convenience hook to just get colors
export function useColors(): ThemeColors {
  const { colors } = useTheme();
  return colors;
}
