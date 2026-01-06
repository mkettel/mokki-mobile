import type { FeatureId, HouseSettings } from "@/types/database";

export type HouseTemplateId = "ski_lease" | "retreat" | "custom";

export interface HouseTemplate {
  id: HouseTemplateId;
  name: string;
  description: string;
  icon: string; // FontAwesome icon name
  features: Record<FeatureId, boolean>;
  defaults: Partial<HouseSettings>;
}

export const HOUSE_TEMPLATES: Record<HouseTemplateId, HouseTemplate> = {
  ski_lease: {
    id: "ski_lease",
    name: "Ski Lease",
    description: "Perfect for seasonal ski house shares",
    icon: "snowflake-8",
    features: {
      calendar: true,
      weather: true,
      expenses: true,
      bulletin: true,
      chat: true,
      broll: true,
      members: true,
      account: true,
    },
    defaults: {
      guestNightlyRate: 50,
      bedSignupEnabled: true,
    },
  },
  retreat: {
    id: "retreat",
    name: "Retreat",
    description: "Great for group trips and getaways",
    icon: "island",
    features: {
      calendar: true,
      weather: false,
      expenses: true,
      bulletin: true,
      chat: true,
      broll: true,
      members: true,
      account: true,
    },
    defaults: {
      guestNightlyRate: 0,
      bedSignupEnabled: false,
      tripTimer: { enabled: true },
    },
  },
  custom: {
    id: "custom",
    name: "Custom",
    description: "Start from scratch, enable what you need",
    icon: "player-settings",
    features: {
      calendar: true,
      weather: true,
      expenses: true,
      bulletin: true,
      chat: true,
      broll: true,
      members: true,
      account: true,
    },
    defaults: {},
  },
};

// Helper to get template list for UI
export const TEMPLATE_LIST: HouseTemplate[] = [
  HOUSE_TEMPLATES.ski_lease,
  HOUSE_TEMPLATES.retreat,
  HOUSE_TEMPLATES.custom,
];

// Feature display info for the onboarding UI
export interface FeatureInfo {
  id: FeatureId;
  name: string;
  description: string;
  icon: string;
}

export const FEATURE_INFO: FeatureInfo[] = [
  {
    id: "calendar",
    name: "Calendar",
    description: "Schedule stays and see who's at the house",
    icon: "calendar",
  },
  {
    id: "weather",
    name: "Snow Report",
    description: "Track snow conditions at nearby resorts",
    icon: "snowflake-o",
  },
  {
    id: "expenses",
    name: "Expenses",
    description: "Split costs and track who owes what",
    icon: "dollar",
  },
  {
    id: "bulletin",
    name: "Bulletin",
    description: "Post notes, todos, and announcements",
    icon: "thumb-tack",
  },
  {
    id: "chat",
    name: "Chat",
    description: "Message the group or members directly",
    icon: "comments",
  },
  {
    id: "broll",
    name: "B-Roll",
    description: "Share photos and videos from the house",
    icon: "camera",
  },
  {
    id: "members",
    name: "Members",
    description: "See who's in the house and invite others",
    icon: "users",
  },
  {
    id: "account",
    name: "Account",
    description: "Manage your profile and settings",
    icon: "user",
  },
];
