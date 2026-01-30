import { SessionBookingConfig } from "@/types/database";

// Default session booking configuration
export const DEFAULT_SESSION_BOOKING_CONFIG: SessionBookingConfig = {
  label: "Book a Session",
  defaultDuration: 45,
  description: undefined,
};

// Available duration options in minutes
export const DURATION_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 40, label: "40 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
];

// Time slot options (hourly slots)
export const TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

// Format time for display (e.g., "09:00" -> "9:00 AM")
export function formatTimeSlot(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// Session status display config
export const SESSION_STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "#f59e0b", // amber
    bgColor: "rgba(245, 158, 11, 0.1)",
  },
  accepted: {
    label: "Accepted",
    color: "#22c55e", // green
    bgColor: "rgba(34, 197, 94, 0.1)",
  },
  declined: {
    label: "Declined",
    color: "#ef4444", // red
    bgColor: "rgba(239, 68, 68, 0.1)",
  },
  cancelled: {
    label: "Cancelled",
    color: "#6b7280", // gray
    bgColor: "rgba(107, 114, 128, 0.1)",
  },
};

// Session block styling (for timeline display)
export const SESSION_BLOCK_STYLE = {
  borderColor: "#8b5cf6", // purple
  backgroundColor: "rgba(139, 92, 246, 0.1)",
  iconName: "handshake-o" as const,
};

// Tentative session block styling (pending requests shown on itinerary)
export const SESSION_BLOCK_TENTATIVE_STYLE = {
  borderColor: "#9ca3af", // gray-400
  backgroundColor: "rgba(156, 163, 175, 0.3)",
  iconName: "clock-o" as const,
};
