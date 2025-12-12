// Mokki Theme Constants
// These colors match the web app's CSS variables (HSL converted to hex/rgb)

// Helper to convert HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Light theme colors (from :root CSS variables)
export const lightColors = {
  // Main colors
  background: "#D9CEBC", // hsl(30, 33%, 82%)
  foreground: "#0A0A0A", // hsl(0, 0%, 3.9%)

  // Card
  card: "#D9CEBC", // hsl(30, 33%, 82%)
  cardForeground: "#0A0A0A", // hsl(0, 0%, 3.9%)

  // Primary (buttons, accents)
  primary: "#171717", // hsl(0, 0%, 9%)
  primaryForeground: "#D9CEBC", // hsl(30, 33%, 82%)

  // Secondary
  secondary: "#CCC2B3", // hsl(30, 28%, 76%)
  secondaryForeground: "#171717", // hsl(0, 0%, 9%)

  // Muted (subtle backgrounds, placeholder text)
  muted: "#CCC2B3", // hsl(30, 28%, 76%)
  mutedForeground: "#737373", // hsl(0, 0%, 45.1%)

  // Accent
  accent: "#CCC2B3", // hsl(30, 28%, 76%)
  accentForeground: "#171717", // hsl(0, 0%, 9%)

  // Destructive (errors, delete buttons)
  destructive: "#E54545", // hsl(0, 84.2%, 60.2%)
  destructiveForeground: "#FAFAFA", // hsl(0, 0%, 98%)

  // Border and input
  border: "#BFB4A3", // hsl(30, 25%, 70%)
  input: "#BFB4A3", // hsl(30, 25%, 70%)
  ring: "#0A0A0A", // hsl(0, 0%, 3.9%)

  // Special
  red: "#E53935", // hsl(0, 74%, 55%) - for house name (matches web 'red' color)
  redText: "#E53935", // alias

  // Geometric background
  geometricBlue: "#4f68c0",
};

// Dark theme colors (from .dark CSS variables)
export const darkColors = {
  // Main colors
  background: "#212121", // hsl(0, 0%, 12.9%)
  foreground: "#FAFAFA", // hsl(0, 0%, 98%)

  // Card
  card: "#212121", // hsl(0, 0%, 12.9%)
  cardForeground: "#FAFAFA", // hsl(0, 0%, 98%)

  // Primary
  primary: "#FAFAFA", // hsl(0, 0%, 98%)
  primaryForeground: "#171717", // hsl(0, 0%, 9%)

  // Secondary
  secondary: "#262626", // hsl(0, 0%, 14.9%)
  secondaryForeground: "#FAFAFA", // hsl(0, 0%, 98%)

  // Muted
  muted: "#262626", // hsl(0, 0%, 14.9%)
  mutedForeground: "#A3A3A3", // hsl(0, 0%, 63.9%)

  // Accent
  accent: "#262626", // hsl(0, 0%, 14.9%)
  accentForeground: "#FAFAFA", // hsl(0, 0%, 98%)

  // Destructive
  destructive: "#B82E2E", // hsl(0, 58.80%, 54.30%) - lighter for dark mode
  destructiveForeground: "#FAFAFA", // hsl(0, 0%, 98%)

  // Border and input
  border: "#262626", // hsl(0, 0%, 14.9%)
  input: "#262626", // hsl(0, 0%, 14.9%)
  ring: "#D4D4D4", // hsl(0, 0%, 83.1%)

  // Special
  red: "#E53935", // hsl(0, 74%, 55%) - for house name
  redText: "#E53935", // alias

  // Geometric background
  geometricBlue: "#4f68c0",
};

// Add red alias for the house name color
export { lightColors as colors };

// Typography
export const typography = {
  // Font families - use the exact names from useFonts
  fontFamily: {
    // Chillax - main UI font (sans-serif)
    chillax: "Chillax-Regular",
    chillaxMedium: "Chillax-Medium",
    chillaxSemibold: "Chillax-Semibold",
    chillaxBold: "Chillax-Bold",
    // Boska - navigation/display font (serif)
    boska: "Boska-Regular",
    boskaMedium: "Boska-Medium",
    boskaBold: "Boska-Bold",
    // Fallback
    system: "System",
  },

  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
    "5xl": 48,
    "6xl": 60,
    "7xl": 72,
  },

  // Font weights
  fontWeight: {
    light: "200",
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
};

// Spacing (matching Tailwind defaults)
export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
};

// Border radius
export const borderRadius = {
  none: 0,
  sm: 2, // calc(var(--radius) - 4px) with --radius: 0.3rem
  md: 4, // calc(var(--radius) - 2px)
  DEFAULT: 6, // var(--radius) = 0.3rem ≈ 4.8px, rounded to 6
  lg: 8,
  xl: 12,
  "2xl": 16,
  full: 9999,
};

// Shadows
export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  DEFAULT: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
};

// Export a function to get current theme colors
export type ThemeColors = typeof lightColors;

export function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? darkColors : lightColors;
}
