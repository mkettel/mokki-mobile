export type AdminPingType =
  | "bed_signup_reminder"
  | "expense_reminder"
  | "calendar_reminder"
  | "itinerary_update"
  | "bulletin_update"
  | "custom_announcement";

export interface PingTemplate {
  id: AdminPingType;
  title: string;
  defaultBody: string;
  icon: string;
  deepLinkTab: string;
}

export const ADMIN_PING_TEMPLATES: PingTemplate[] = [
  {
    id: "bed_signup_reminder",
    title: "Bed Sign-Up Reminder",
    defaultBody: "Don't forget to claim your bed for the weekend!",
    icon: "bed",
    deepLinkTab: "calendar",
  },
  {
    id: "expense_reminder",
    title: "Expense Reminder",
    defaultBody: "Please review outstanding expenses and settle up.",
    icon: "credit-card",
    deepLinkTab: "expenses",
  },
  {
    id: "calendar_reminder",
    title: "Calendar Reminder",
    defaultBody: "New events have been added to the calendar.",
    icon: "calendar",
    deepLinkTab: "calendar",
  },
  {
    id: "itinerary_update",
    title: "Itinerary Update",
    defaultBody: "The trip itinerary has been updated.",
    icon: "map",
    deepLinkTab: "itinerary",
  },
  {
    id: "bulletin_update",
    title: "Bulletin Update",
    defaultBody: "New post on the bulletin board - check it out!",
    icon: "thumb-tack",
    deepLinkTab: "home",
  },
  {
    id: "custom_announcement",
    title: "Custom Announcement",
    defaultBody: "",
    icon: "bullhorn",
    deepLinkTab: "home",
  },
];

export function getTemplateById(id: AdminPingType): PingTemplate | undefined {
  return ADMIN_PING_TEMPLATES.find((t) => t.id === id);
}
