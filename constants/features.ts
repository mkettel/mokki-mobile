import { FeatureId, FeatureConfig } from "@/types/database";

// Default feature configuration - used when house has no custom settings
export const DEFAULT_FEATURE_CONFIG: Record<FeatureId, FeatureConfig> = {
  calendar: { enabled: true, label: "Reserve your bed" },
  itinerary: { enabled: false, label: "Itinerary" },
  weather: { enabled: true, label: "Pow report" },
  broll: { enabled: true, label: "B-roll" },
  bulletin: { enabled: true, label: "Bulletin board" },
  expenses: { enabled: true, label: "Pay up" },
  chat: { enabled: false, label: "Chat" },
  members: { enabled: true, label: "Who's who" },
  account: { enabled: true, label: "About you" },
};

// Feature to route mapping
export const FEATURE_ROUTES: Record<FeatureId, string> = {
  calendar: "/(tabs)/calendar",
  itinerary: "/(tabs)/itinerary",
  weather: "/(tabs)/weather",
  broll: "/(tabs)/broll",
  bulletin: "/(tabs)/bulletin",
  expenses: "/(tabs)/expenses",
  chat: "/(tabs)/chat",
  members: "/members",
  account: "/(tabs)/account",
};

// Feature to FontAwesome icon mapping
export const FEATURE_ICONS: Record<FeatureId, string> = {
  calendar: "calendar",
  itinerary: "list-alt",
  weather: "snowflake-o",
  broll: "camera",
  bulletin: "thumb-tack",
  expenses: "dollar",
  chat: "comments",
  members: "users",
  account: "user",
};

// Order for display in settings and navigation
export const FEATURE_ORDER: FeatureId[] = [
  "calendar",
  "itinerary",
  "weather",
  "broll",
  "bulletin",
  "expenses",
  "chat",
  "members",
  "account",
];
