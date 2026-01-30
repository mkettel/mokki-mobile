// Guest fee rate per night per guest
export const GUEST_FEE_PER_NIGHT = 50;

// Expense categories for display
export const EXPENSE_CATEGORIES = [
  { value: "groceries", label: "Groceries" },
  { value: "utilities", label: "Utilities" },
  { value: "supplies", label: "Supplies" },
  { value: "rent", label: "Rent" },
  { value: "guest_fees", label: "Guest Fees" },
  { value: "entertainment", label: "Entertainment" },
  { value: "transportation", label: "Transportation" },
  { value: "other", label: "Other" },
] as const;

// File upload limits (matching web app)
export const FILE_LIMITS = {
  AVATAR_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  IMAGE_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  VIDEO_MAX_SIZE: 100 * 1024 * 1024, // 100MB
  BATCH_UPLOAD_LIMIT: 20,
};

// Supported file types
export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
];

export const SUPPORTED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

// Storage key for active house
export const ACTIVE_HOUSE_STORAGE_KEY = "mokki_active_house";

// Re-export session booking constants
export * from "./sessionBooking";
