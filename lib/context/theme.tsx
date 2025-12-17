import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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
import type { HouseTheme } from "@/types/database";

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
  // House-level theming
  houseTheme: HouseTheme | null;
  setHouseTheme: (theme: HouseTheme | null) => void;
};

const THEME_STORAGE_KEY = "@mokki_theme";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useRNColorScheme();
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [isLoaded, setIsLoaded] = useState(false);
  const [houseTheme, setHouseTheme] = useState<HouseTheme | null>(null);

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

  // Merge base colors with house theme overrides
  const colors = useMemo(() => {
    const baseColors = isDark ? darkColors : lightColors;

    // If no house theme or no accent color, use base colors
    if (!houseTheme?.accentColor) {
      return baseColors;
    }

    // Override accent-related colors with house theme
    return {
      ...baseColors,
      geometricBlue: houseTheme.accentColor,
      // Could expand to override more colors based on accent
    };
  }, [isDark, houseTheme]);

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
        houseTheme,
        setHouseTheme,
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
