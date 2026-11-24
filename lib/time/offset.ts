import { getOffsetMinutes, type Instant } from "./zoned";

const MINUS = "−";

/** "UTC+5:45", "UTC−3:30", "UTC+0". */
export function formatOffset(minutes: number): string {
  if (minutes === 0) return "UTC+0";
  const sign = minutes > 0 ? "+" : MINUS;
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

/** Minutes `timeZone` is ahead of `refZone` at `instant` (negative = behind). */
export function getTimeDifferenceMinutes(
  instant: Instant,
  timeZone: string,
  refZone: string,
): number {
  return getOffsetMinutes(instant, timeZone) - getOffsetMinutes(instant, refZone);
}

/** Compact signed duration: "+5h 45m", "−3h", "+30m", "±0". */
export function formatSignedDuration(minutes: number): string {
  if (minutes === 0) return "±0";
  const sign = minutes > 0 ? "+" : MINUS;
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const parts = [h ? `${h}h` : "", m ? `${m}m` : ""].filter(Boolean);
  return `${sign}${parts.join(" ")}`;
}

/** Human sentence: "5h 45m ahead", "3h behind", "Same time". */
export function formatDifference(minutes: number): string {
  if (minutes === 0) return "Same time as you";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const dur = [h ? `${h}h` : "", m ? `${m}m` : ""].filter(Boolean).join(" ");
  return `${dur} ${minutes > 0 ? "ahead" : "behind"}`;
}
