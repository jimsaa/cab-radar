/** Swedish local time for all user-facing timestamps (CET/CEST). */
export const STOCKHOLM_TIMEZONE = "Europe/Stockholm";
export const SWEDISH_LOCALE = "sv-SE";

const RELATIVE_CUTOFF_MS = 24 * 60 * 60 * 1000;

export function parseInstant(value: string | Date | number): Date {
  if (value instanceof Date) return value;
  return new Date(value);
}

function stockholmParts(
  value: string | Date | number,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat(SWEDISH_LOCALE, {
    timeZone: STOCKHOLM_TIMEZONE,
    ...options,
  }).formatToParts(parseInstant(value));
}

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes
): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

/** 24-hour clock in Swedish local time, e.g. "14:03". */
export function formatSwedishTime(
  value: string | Date | number | null | undefined
): string {
  if (value == null) return "—";
  const parts = stockholmParts(value, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${part(parts, "hour")}:${part(parts, "minute")}`;
}

/** Absolute date and time, e.g. "2026-06-12 19:42". */
export function formatSwedishDateTime(
  value: string | Date | number | null | undefined
): string {
  if (value == null) return "—";
  const parts = stockholmParts(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")} ${part(parts, "hour")}:${part(parts, "minute")}`;
}

/** Date only in Swedish local time, e.g. "2026-06-12". */
export function formatSwedishDate(
  value: string | Date | number | null | undefined
): string {
  if (value == null) return "—";
  const parts = stockholmParts(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`;
}

/** Relative Swedish time; switches to absolute after 24 hours. */
export function formatRelativeSwedish(
  value: string | Date | number | null | undefined
): string {
  if (value == null) return "—";

  const diffMs = Date.now() - parseInstant(value).getTime();
  if (diffMs < 0) return formatSwedishDateTime(value);

  if (diffMs >= RELATIVE_CUTOFF_MS) {
    return formatSwedishDateTime(value);
  }

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just nu";
  if (minutes === 1) return "För 1 minut sedan";
  if (minutes < 60) return `För ${minutes} minuter sedan`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "För 1 timme sedan";
  return `För ${hours} timmar sedan`;
}

/** Expiry countdown in Swedish, e.g. "går ut om 14 minuter". */
export function formatExpirySwedish(iso: string): string {
  const diffMs = parseInstant(iso).getTime() - Date.now();
  const minutes = Math.max(0, Math.floor(diffMs / 60_000));

  if (minutes < 60) {
    if (minutes === 1) return "går ut om 1 minut";
    return `går ut om ${minutes} minuter`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "går ut om 1 timme";
  return `går ut om ${hours} timmar`;
}

export function millisecondsSince(
  value: string | Date | number | null | undefined
): number | null {
  if (value == null) return null;
  return Math.max(0, Date.now() - parseInstant(value).getTime());
}

export function secondsSinceTimestamp(timestamp: number | null): number | null {
  if (timestamp == null) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
}

/** Current clock string in Europe/Stockholm (for live headers). */
export function formatSwedishClockNow(): string {
  return formatSwedishTime(new Date());
}

/** Long weekday date in Swedish local time, e.g. "Fredag 12 juni". */
export function formatSwedishWeekdayDateLong(
  value: string | Date | number = new Date()
): string {
  const formatted = new Intl.DateTimeFormat(SWEDISH_LOCALE, {
    timeZone: STOCKHOLM_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseInstant(value));

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Observed date from ISO date or timestamp. */
export function formatSwedishObservedDate(
  value: string | null | undefined
): string {
  if (!value?.trim()) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  return formatSwedishDate(value);
}
