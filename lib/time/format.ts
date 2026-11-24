import { toMs, type Instant } from "./zoned";

export interface TimeFormatOptions {
  hour12: boolean;
  seconds: boolean;
}

const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(key: string, make: () => Intl.DateTimeFormat): Intl.DateTimeFormat {
  let f = cache.get(key);
  if (!f) {
    f = make();
    cache.set(key, f);
  }
  return f;
}

/** "15:04", "15:04:09", "3:04 PM", "3:04:09 PM". Locale fixed to en-US for stable output. */
export function formatTime(instant: Instant, timeZone: string, opts: TimeFormatOptions): string {
  const key = `t|${timeZone}|${opts.hour12 ? 12 : 24}|${opts.seconds ? 1 : 0}`;
  return formatter(
    key,
    () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: opts.hour12 ? "numeric" : "2-digit",
        minute: "2-digit",
        ...(opts.seconds ? { second: "2-digit" } : {}),
        ...(opts.hour12 ? { hour12: true } : { hourCycle: "h23" }),
      }),
  ).format(toMs(instant));
}

/** Splits a 12h time into ["3:04:09", "PM"]; 24h returns [time, ""]. */
export function splitMeridiem(formatted: string): [string, string] {
  const m = /^(.*?)\s?(AM|PM)$/i.exec(formatted);
  return m ? [m[1] ?? formatted, (m[2] ?? "").toUpperCase()] : [formatted, ""];
}

/** "Wed, Nov 25" */
export function formatShortDate(instant: Instant, timeZone: string): string {
  return formatter(
    `sd|${timeZone}`,
    () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
  ).format(toMs(instant));
}

/** "Wednesday, November 25, 2026" */
export function formatLongDate(instant: Instant, timeZone: string): string {
  return formatter(
    `ld|${timeZone}`,
    () =>
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
  ).format(toMs(instant));
}

/** "PKT", "GMT+5:45", "EST" — whatever the runtime's ICU knows. */
export function getTimeZoneAbbreviation(instant: Instant, timeZone: string): string {
  const parts = formatter(
    `abbr|${timeZone}`,
    () => new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" }),
  ).formatToParts(toMs(instant));
  return parts.find((p) => p.type === "timeZoneName")?.value ?? timeZone;
}

/** "Pakistan Standard Time" */
export function getTimeZoneLongName(instant: Instant, timeZone: string): string {
  const parts = formatter(
    `long|${timeZone}`,
    () => new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "long" }),
  ).formatToParts(toMs(instant));
  return parts.find((p) => p.type === "timeZoneName")?.value ?? timeZone;
}

/** "13h 42m" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** Natural relative-day label for a city vs. the user: "Today" / "Tomorrow" / "Yesterday". */
export function relativeDayLabel(delta: number): string {
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";
  return delta > 0 ? `+${delta} days` : `${delta} days`;
}
