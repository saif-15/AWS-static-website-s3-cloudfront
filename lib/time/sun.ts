/**
 * Solar position, sunrise/sunset and day/night — NOAA solar calculator equations.
 * Accuracy is ~1 minute for latitudes between ±72°, which is plenty for a clock.
 */
import { getZonedParts, toMs, zonedTimeToUtc, type Instant } from "./zoned";

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Elevation the sun's centre has at apparent sunrise/sunset (refraction + radius). */
export const SUNRISE_ELEVATION = -0.833;

interface SolarParams {
  /** Declination in degrees. */
  declination: number;
  /** Equation of time in minutes. */
  eqTime: number;
}

export function solarParams(instant: Instant): SolarParams {
  const jd = toMs(instant) / 86_400_000 + 2440587.5;
  const jc = (jd - 2451545) / 36525;
  const l0 = (((280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360) + 360) % 360;
  const m = 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
  const e = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);
  const c =
    Math.sin(m * RAD) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) +
    Math.sin(2 * m * RAD) * (0.019993 - 0.000101 * jc) +
    Math.sin(3 * m * RAD) * 0.000289;
  const trueLong = l0 + c;
  const omega = 125.04 - 1934.136 * jc;
  const appLong = trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const meanObliq = 23 + (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60;
  const obliq = meanObliq + 0.00256 * Math.cos(omega * RAD);
  const declination = Math.asin(Math.sin(obliq * RAD) * Math.sin(appLong * RAD)) * DEG;
  const y = Math.tan((obliq / 2) * RAD) ** 2;
  const eqTime =
    4 *
    DEG *
    (y * Math.sin(2 * l0 * RAD) -
      2 * e * Math.sin(m * RAD) +
      4 * e * y * Math.sin(m * RAD) * Math.cos(2 * l0 * RAD) -
      0.5 * y * y * Math.sin(4 * l0 * RAD) -
      1.25 * e * e * Math.sin(2 * m * RAD));
  return { declination, eqTime };
}

function normaliseLon(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/** Point on Earth where the sun is directly overhead: [lon, lat]. */
export function getSubsolarPoint(instant: Instant): [number, number] {
  const ms = toMs(instant);
  const { declination, eqTime } = solarParams(ms);
  const utcMinutes = (((ms % 86_400_000) + 86_400_000) % 86_400_000) / 60_000;
  const lon = -(utcMinutes + eqTime - 720) / 4;
  return [normaliseLon(lon), declination];
}

/** Opposite side of the globe: [lon, lat]. */
export function antipode([lon, lat]: [number, number]): [number, number] {
  return [normaliseLon(lon + 180), -lat];
}

/** Great-circle angular distance in degrees. */
export function angularDistance(a: [number, number], b: [number, number]): number {
  const [l1, p1] = a;
  const [l2, p2] = b;
  const cos =
    Math.sin(p1 * RAD) * Math.sin(p2 * RAD) +
    Math.cos(p1 * RAD) * Math.cos(p2 * RAD) * Math.cos((l2 - l1) * RAD);
  return Math.acos(Math.min(1, Math.max(-1, cos))) * DEG;
}

/** Solar elevation above the horizon in degrees. */
export function getSolarElevation(instant: Instant, lat: number, lon: number): number {
  return 90 - angularDistance([lon, lat], getSubsolarPoint(instant));
}

export type DayPhase = "day" | "civil" | "nautical" | "astronomical" | "night";

export function getDayPhase(instant: Instant, lat: number, lon: number): DayPhase {
  const el = getSolarElevation(instant, lat, lon);
  if (el > SUNRISE_ELEVATION) return "day";
  if (el > -6) return "civil";
  if (el > -12) return "nautical";
  if (el > -18) return "astronomical";
  return "night";
}

export function isDaytime(instant: Instant, lat: number, lon: number): boolean {
  return getSolarElevation(instant, lat, lon) > SUNRISE_ELEVATION;
}

export interface SunTimes {
  /** UTC ms, or null during polar day/night. */
  sunrise: number | null;
  sunset: number | null;
  solarNoon: number;
  state: "normal" | "polar-day" | "polar-night";
  /** Minutes of daylight. */
  dayLength: number;
}

/**
 * Sunrise and sunset for the calendar day that `instant` falls on in `timeZone`,
 * at the given coordinates. Anchors on local noon so cities whose clocks are far
 * from solar time (e.g. Kiritimati at UTC+14) still get the right day.
 */
export function getSunTimes(
  instant: Instant,
  timeZone: string,
  lat: number,
  lon: number,
): SunTimes {
  const p = getZonedParts(instant, timeZone);
  const localNoon = zonedTimeToUtc(
    { year: p.year, month: p.month, day: p.day, hour: 12, minute: 0 },
    timeZone,
  );

  // Two passes: estimate solar noon, then refine with parameters at that instant.
  let solarNoon = localNoon;
  let params = solarParams(solarNoon);
  for (let i = 0; i < 2; i++) {
    const noonMinutesUtc = 720 - 4 * lon - params.eqTime;
    const utcMinutesOfAnchor = (((localNoon % 86_400_000) + 86_400_000) % 86_400_000) / 60_000;
    let delta = noonMinutesUtc - utcMinutesOfAnchor;
    delta = ((((delta + 720) % 1440) + 1440) % 1440) - 720;
    solarNoon = localNoon + delta * 60_000;
    params = solarParams(solarNoon);
  }

  const cosHa =
    Math.cos((90 - SUNRISE_ELEVATION) * RAD) /
      (Math.cos(lat * RAD) * Math.cos(params.declination * RAD)) -
    Math.tan(lat * RAD) * Math.tan(params.declination * RAD);

  if (cosHa > 1) {
    return { sunrise: null, sunset: null, solarNoon, state: "polar-night", dayLength: 0 };
  }
  if (cosHa < -1) {
    return { sunrise: null, sunset: null, solarNoon, state: "polar-day", dayLength: 1440 };
  }
  const haMinutes = Math.acos(cosHa) * DEG * 4;
  return {
    sunrise: solarNoon - haMinutes * 60_000,
    sunset: solarNoon + haMinutes * 60_000,
    solarNoon,
    state: "normal",
    dayLength: haMinutes * 2,
  };
}
