/**
 * Date utilities that handle timezone issues correctly.
 *
 * The core problem: JavaScript's `new Date("YYYY-MM-DD")` parses the string as UTC midnight,
 * which can display as the previous day in timezones west of UTC.
 *
 * Similarly, `date.toISOString().split("T")[0]` converts to UTC first, which can shift
 * the date forward in timezones where the local time is in the evening.
 *
 * These utilities ensure dates are always handled in local time.
 */

/**
 * Parse a YYYY-MM-DD date string as local time (not UTC).
 * Use this when reading dates from the database.
 */
export function parseLocalDate(dateString: string): Date {
  // If it's a date-only string (YYYY-MM-DD), parse as local time
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  // Otherwise, let Date parse it normally (for full timestamps)
  return new Date(dateString);
}

/**
 * Format a Date object as YYYY-MM-DD using local time (not UTC).
 * Use this when saving dates to the database.
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
