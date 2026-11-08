import type { TimeZoneOption } from "../types";

/** The sentinel that means "follow whatever the browser reports". */
export const deviceTimeZoneId = "device";

/**
 * One city per offset the world actually uses, half-hour and quarter-hour
 * zones included. Ported verbatim from the Flutter picker, offsets and all —
 * these are standard-time offsets, not the current ones, exactly as the app
 * prints them.
 */
export const timeZoneOptions: TimeZoneOption[] = [
  { id: "Pacific/Pago_Pago", label: "Pago Pago", utcOffset: "UTC−11:00" },
  { id: "Pacific/Honolulu", label: "Honolulu", utcOffset: "UTC−10:00" },
  { id: "America/Anchorage", label: "Anchorage", utcOffset: "UTC−09:00" },
  { id: "America/Los_Angeles", label: "Los Angeles", utcOffset: "UTC−08:00" },
  { id: "America/Denver", label: "Denver", utcOffset: "UTC−07:00" },
  { id: "America/Chicago", label: "Chicago", utcOffset: "UTC−06:00" },
  { id: "America/New_York", label: "New York", utcOffset: "UTC−05:00" },
  { id: "America/Halifax", label: "Halifax", utcOffset: "UTC−04:00" },
  { id: "America/St_Johns", label: "St. John’s", utcOffset: "UTC−03:30" },
  { id: "America/Sao_Paulo", label: "São Paulo", utcOffset: "UTC−03:00" },
  {
    id: "Atlantic/South_Georgia",
    label: "South Georgia",
    utcOffset: "UTC−02:00",
  },
  { id: "Atlantic/Azores", label: "Azores", utcOffset: "UTC−01:00" },
  { id: "Etc/UTC", label: "UTC / GMT", utcOffset: "UTC+00:00" },
  { id: "Europe/London", label: "London", utcOffset: "UTC+00:00" },
  { id: "Europe/Paris", label: "Paris", utcOffset: "UTC+01:00" },
  { id: "Europe/Athens", label: "Athens", utcOffset: "UTC+02:00" },
  { id: "Africa/Nairobi", label: "Nairobi", utcOffset: "UTC+03:00" },
  { id: "Asia/Tehran", label: "Tehran", utcOffset: "UTC+03:30" },
  { id: "Asia/Dubai", label: "Dubai", utcOffset: "UTC+04:00" },
  { id: "Asia/Kabul", label: "Kabul", utcOffset: "UTC+04:30" },
  { id: "Asia/Karachi", label: "Karachi", utcOffset: "UTC+05:00" },
  { id: "Asia/Kolkata", label: "Kolkata", utcOffset: "UTC+05:30" },
  { id: "Asia/Kathmandu", label: "Kathmandu", utcOffset: "UTC+05:45" },
  { id: "Asia/Dhaka", label: "Dhaka", utcOffset: "UTC+06:00" },
  { id: "Asia/Yangon", label: "Yangon", utcOffset: "UTC+06:30" },
  { id: "Asia/Bangkok", label: "Bangkok", utcOffset: "UTC+07:00" },
  { id: "Asia/Singapore", label: "Singapore", utcOffset: "UTC+08:00" },
  { id: "Australia/Eucla", label: "Eucla", utcOffset: "UTC+08:45" },
  { id: "Asia/Tokyo", label: "Tokyo", utcOffset: "UTC+09:00" },
  { id: "Australia/Adelaide", label: "Adelaide", utcOffset: "UTC+09:30" },
  { id: "Australia/Sydney", label: "Sydney", utcOffset: "UTC+10:00" },
  {
    id: "Australia/Lord_Howe",
    label: "Lord Howe Island",
    utcOffset: "UTC+10:30",
  },
  { id: "Pacific/Noumea", label: "Nouméa", utcOffset: "UTC+11:00" },
  { id: "Pacific/Auckland", label: "Auckland", utcOffset: "UTC+12:00" },
  { id: "Pacific/Chatham", label: "Chatham Islands", utcOffset: "UTC+12:45" },
  { id: "Pacific/Tongatapu", label: "Nukuʻalofa", utcOffset: "UTC+13:00" },
  { id: "Pacific/Kiritimati", label: "Kiritimati", utcOffset: "UTC+14:00" },
];

export function timeZoneOptionById(id: string): TimeZoneOption | undefined {
  return timeZoneOptions.find((zone) => zone.id === id);
}

/**
 * What the device's own zone is called, e.g. `India Standard Time · UTC+05:30`.
 *
 * Flutter reads `DateTime.now().timeZoneName`; the browser's equivalent is the
 * IANA id, which is more useful, so it is preferred when available. Must only
 * be called in the browser — the server's zone is not the player's.
 */
export function deviceTimeZoneDescription(now: Date = new Date()): string {
  // getTimezoneOffset counts minutes *behind* UTC, so the sign is inverted.
  const minutes = -now.getTimezoneOffset();
  const sign = minutes < 0 ? "−" : "+";
  const absolute = Math.abs(minutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const rest = String(absolute % 60).padStart(2, "0");
  const offset = `UTC${sign}${hours}:${rest}`;

  let name = "";
  try {
    name = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    // An environment without a full ICU build reports nothing; the offset alone
    // still tells the player what they are on.
  }
  return name ? `${name} · ${offset}` : offset;
}
