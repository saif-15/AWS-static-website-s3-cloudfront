import { describe, expect, it } from "vitest";
import { getTerminator } from "./terminator";
import {
  angularDistance,
  getDayPhase,
  getSolarElevation,
  getSubsolarPoint,
  getSunTimes,
  isDaytime,
} from "./sun";
import { getZonedParts } from "./zoned";

const utc = (s: string) => Date.parse(s);
const MIN = 60_000;

function localHM(ms: number, tz: string) {
  const p = getZonedParts(ms, tz);
  return p.hour * 60 + p.minute;
}

describe("subsolar point", () => {
  it("is near the Tropic of Cancer at the June solstice", () => {
    const [, lat] = getSubsolarPoint(utc("2026-06-21T12:00:00Z"));
    expect(lat).toBeCloseTo(23.44, 0);
  });

  it("is near the equator at the March equinox", () => {
    const [, lat] = getSubsolarPoint(utc("2026-03-20T12:00:00Z"));
    expect(Math.abs(lat)).toBeLessThan(0.5);
  });

  it("sits near the prime meridian around 12:00 UTC", () => {
    const [lon] = getSubsolarPoint(utc("2026-04-15T12:00:00Z"));
    expect(Math.abs(lon)).toBeLessThan(2);
  });
});

describe("sunrise / sunset", () => {
  it("London on the June solstice: ~04:43 rise, ~21:21 set (BST)", () => {
    const tz = "Europe/London";
    const s = getSunTimes(utc("2026-06-21T12:00:00Z"), tz, 51.5074, -0.1278);
    expect(s.state).toBe("normal");
    expect(Math.abs(localHM(s.sunrise ?? 0, tz) - (4 * 60 + 43))).toBeLessThanOrEqual(3);
    expect(Math.abs(localHM(s.sunset ?? 0, tz) - (21 * 60 + 21))).toBeLessThanOrEqual(3);
  });

  it("Karachi in late November: ~06:55 rise, ~17:40 set (PKT)", () => {
    const tz = "Asia/Karachi";
    const s = getSunTimes(utc("2026-11-25T08:00:00Z"), tz, 24.8607, 67.0011);
    expect(Math.abs(localHM(s.sunrise ?? 0, tz) - (6 * 60 + 55))).toBeLessThanOrEqual(6);
    expect(Math.abs(localHM(s.sunset ?? 0, tz) - (17 * 60 + 40))).toBeLessThanOrEqual(6);
  });

  it("returns the sunrise of the *local* day even at UTC+14", () => {
    const tz = "Pacific/Kiritimati";
    const now = utc("2026-11-25T20:00:00Z"); // 10:00 on Nov 26 locally
    const s = getSunTimes(now, tz, 1.8721, -157.4278);
    expect(getZonedParts(s.sunrise ?? 0, tz).day).toBe(26);
    expect(getZonedParts(s.sunset ?? 0, tz).day).toBe(26);
  });

  it("reports polar night and polar day", () => {
    const tromso = { lat: 69.65, lon: 18.96 };
    const dec = getSunTimes(utc("2026-12-21T12:00:00Z"), "Europe/Oslo", tromso.lat, tromso.lon);
    expect(dec.state).toBe("polar-night");
    expect(dec.sunrise).toBeNull();
    const jun = getSunTimes(utc("2026-06-21T12:00:00Z"), "Europe/Oslo", tromso.lat, tromso.lon);
    expect(jun.state).toBe("polar-day");
    expect(jun.dayLength).toBe(1440);
  });

  it("day length is ~12h at the equator", () => {
    const s = getSunTimes(utc("2026-03-20T12:00:00Z"), "Asia/Singapore", 1.35, 103.82);
    expect(Math.abs(s.dayLength - 12 * 60)).toBeLessThan(15);
    expect((s.sunset ?? 0) - (s.sunrise ?? 0)).toBeCloseTo(s.dayLength * MIN, -3);
  });
});

describe("day/night and terminator", () => {
  it("noon in Singapore is day, midnight is night", () => {
    expect(isDaytime(utc("2026-11-25T05:00:00Z"), 1.35, 103.82)).toBe(true);
    expect(isDaytime(utc("2026-11-25T17:00:00Z"), 1.35, 103.82)).toBe(false);
    expect(getDayPhase(utc("2026-11-25T17:00:00Z"), 1.35, 103.82)).toBe("night");
  });

  it("subsolar point has ~90° elevation", () => {
    const t = utc("2026-11-25T10:00:00Z");
    const [lon, lat] = getSubsolarPoint(t);
    expect(getSolarElevation(t, lat, lon)).toBeCloseTo(90, 3);
  });

  it("terminator bands are caps around the anti-solar point with shrinking radii", () => {
    const term = getTerminator(utc("2026-11-25T10:00:00Z"));
    expect(angularDistance(term.subsolar, term.antisolar)).toBeCloseTo(180, 3);
    const radii = term.bands.map((b) => b.radius);
    expect(radii).toEqual([...radii].sort((a, b) => b - a));
    expect(radii[0]).toBeCloseTo(89.167, 2);
    expect(term.bands[0]?.polygon.type).toBe("Polygon");
  });
});
