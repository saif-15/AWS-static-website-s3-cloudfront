import { parseLocalDateTime, toLocalDateTimeString } from "./share";
import { getZonedParts, zonedTimeToUtc } from "./time/zoned";

/** UTC instant for a wall-clock "YYYY-MM-DDTHH:mm" in `timeZone`. */
export function momentInstant(local: string, timeZone: string): number {
  return zonedTimeToUtc(parseLocalDateTime(local), timeZone);
}

/** The same instant as a local "YYYY-MM-DDTHH:mm" string in another zone. */
export function localStringIn(instant: number, timeZone: string): string {
  return toLocalDateTimeString(getZonedParts(instant, timeZone));
}

export type DayPeriod = "night" | "early" | "work" | "evening";

/** Rough "is this a reasonable time to call?" classification by local hour. */
export function dayPeriod(instant: number, timeZone: string): DayPeriod {
  const { hour, weekday } = getZonedParts(instant, timeZone);
  if (hour < 7 || hour >= 22) return "night";
  if (hour < 9) return "early";
  if (hour < 18 && weekday !== 0 && weekday !== 6) return "work";
  return "evening";
}

export const PERIOD_LABEL: Record<DayPeriod, string> = {
  night: "Night",
  early: "Early",
  work: "Working hours",
  evening: "Off hours",
};

/** Next full hour in `timeZone` (tomorrow if that would be past 21:00), as a local string. */
export function defaultMomentLocal(now: number, timeZone: string): string {
  const p = getZonedParts(now, timeZone);
  let instant = now + (60 - p.minute) * 60_000 - p.second * 1000;
  if (getZonedParts(instant, timeZone).hour >= 21) {
    // Tomorrow at 10:00 local.
    const t = getZonedParts(now + 24 * 3600_000, timeZone);
    instant = zonedTimeToUtc(
      { year: t.year, month: t.month, day: t.day, hour: 10, minute: 0 },
      timeZone,
    );
  }
  return localStringIn(instant, timeZone);
}

/** "in 3 hours", "2 days ago", "now" */
export function formatRelative(target: number, now: number): string {
  const diff = target - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60_000) return "now";
  if (abs < 3600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < 2 * 86_400_000) return rtf.format(Math.round(diff / 3600_000), "hour");
  return rtf.format(Math.round(diff / 86_400_000), "day");
}
