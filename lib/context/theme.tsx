import React, { createContext, useContext } from "react";
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

type ThemeContextType = {
  isDark: boolean;
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
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
