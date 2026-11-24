import { getOffsetMinutes, getZonedParts, toMs, type Instant } from "./zoned";

/**
 * Standard (non-DST) offset for a zone in a given year: the smaller of the
 * January and July offsets. Works for both hemispheres.
 */
export function getStandardOffsetMinutes(year: number, timeZone: string): number {
  const jan = getOffsetMinutes(Date.UTC(year, 0, 1, 12), timeZone);
  const jul = getOffsetMinutes(Date.UTC(year, 6, 1, 12), timeZone);
  return Math.min(jan, jul);
}

/** Does the zone shift its clocks at any point in this year? */
export function observesDST(year: number, timeZone: string): boolean {
  const jan = getOffsetMinutes(Date.UTC(year, 0, 1, 12), timeZone);
  const jul = getOffsetMinutes(Date.UTC(year, 6, 1, 12), timeZone);
  return jan !== jul;
}

/** Is daylight-saving time in effect at `instant`? */
export function isDST(instant: Instant, timeZone: string): boolean {
  const { year } = getZonedParts(instant, timeZone);
  if (!observesDST(year, timeZone)) return false;
  return getOffsetMinutes(instant, timeZone) > getStandardOffsetMinutes(year, timeZone);
}

export interface OffsetTransition {
  /** UTC instant (ms) at which the new offset takes effect. */
  at: number;
  fromOffset: number;
  toOffset: number;
}

/**
 * Find the next change in UTC offset after `instant`, within `horizonDays`.
 * Scans in 1-day steps then binary-searches to the minute.
 */
export function findNextTransition(
  instant: Instant,
  timeZone: string,
  horizonDays = 400,
): OffsetTransition | null {
  const DAY = 86_400_000;
  const start = toMs(instant);
  const startOffset = getOffsetMinutes(start, timeZone);
  let lo = start;
  for (let i = 1; i <= horizonDays; i++) {
    const hi = start + i * DAY;
    if (getOffsetMinutes(hi, timeZone) !== startOffset) {
      let a = lo;
      let b = hi;
      while (b - a > 60_000) {
        const mid = Math.floor((a + b) / 2 / 60_000) * 60_000;
        if (getOffsetMinutes(mid, timeZone) === startOffset) a = mid;
        else b = mid;
      }
      return { at: b, fromOffset: startOffset, toOffset: getOffsetMinutes(b, timeZone) };
    }
    lo = hi;
  }
  return null;
}
