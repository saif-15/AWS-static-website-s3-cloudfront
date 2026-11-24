/**
 * Core zone math. Everything is derived from IANA zones via `Intl.DateTimeFormat`;
 * no UTC offsets or DST rules are hardcoded anywhere.
 */

export type Instant = Date | number;

export interface ZonedParts {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  /** 0–23 */
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
}

export interface LocalDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const partsCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

export function toMs(instant: Instant): number {
  return typeof instant === "number" ? instant : instant.getTime();
}

/** Wall-clock fields for an instant in a zone. */
export function getZonedParts(instant: Instant, timeZone: string): ZonedParts {
  const out: ZonedParts = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0, weekday: 0 };
  for (const p of partsFormatter(timeZone).formatToParts(toMs(instant))) {
    switch (p.type) {
      case "year":
        out.year = Number(p.value);
        break;
      case "month":
        out.month = Number(p.value);
        break;
      case "day":
        out.day = Number(p.value);
        break;
      case "hour":
        // Some engines emit "24" at midnight even with h23; normalise.
        out.hour = Number(p.value) % 24;
        break;
      case "minute":
        out.minute = Number(p.value);
        break;
      case "second":
        out.second = Number(p.value);
        break;
      case "weekday":
        out.weekday = WEEKDAYS[p.value] ?? 0;
        break;
    }
  }
  return out;
}

/** UTC offset of `timeZone` at `instant`, in minutes (e.g. +345 for Kathmandu). */
export function getOffsetMinutes(instant: Instant, timeZone: string): number {
  const ms = toMs(instant);
  const p = getZonedParts(ms, timeZone);
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const truncated = Math.floor(ms / 1000) * 1000;
  return Math.round((wallAsUtc - truncated) / 60000);
}

/**
 * Convert a wall-clock time in `timeZone` to a UTC instant (ms).
 * - Non-existent times (spring-forward gap) resolve forward by the gap length.
 * - Ambiguous times (fall-back overlap) resolve to the earlier instant.
 */
export function zonedTimeToUtc(local: LocalDateTime, timeZone: string): number {
  const wall = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  // Try both candidate offsets around the wall time; prefer one that round-trips.
  const o1 = getOffsetMinutes(wall - 24 * 3600_000, timeZone);
  const o2 = getOffsetMinutes(wall + 24 * 3600_000, timeZone);
  const candidates = [...new Set([o1, o2])]
    .map((o) => wall - o * 60_000)
    .filter((t) => getOffsetMinutes(t, timeZone) * 60_000 === wall - t)
    .sort((a, b) => a - b);
  const exact = candidates[0];
  if (exact !== undefined) return exact;
  // Gap: no offset round-trips. Use the offset in effect before the gap, which
  // lands the instant after the transition (wall time pushed forward).
  return wall - Math.min(o1, o2) * 60_000;
}

/** Calendar date (YYYY-MM-DD) for an instant in a zone, as a comparable day number. */
export function zonedDayNumber(instant: Instant, timeZone: string): number {
  const p = getZonedParts(instant, timeZone);
  return Math.floor(Date.UTC(p.year, p.month - 1, p.day) / 86_400_000);
}

/** -1, 0, +1 (or more) — how many calendar days `timeZone` is ahead of `refZone`. */
export function dayDelta(instant: Instant, timeZone: string, refZone: string): number {
  return zonedDayNumber(instant, timeZone) - zonedDayNumber(instant, refZone);
}

/** True if the runtime recognises the IANA zone. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
