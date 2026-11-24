import { describe, expect, it } from "vitest";
import { CITIES, CITY_BY_ID, flagEmoji } from "@/data/cities";
import { isValidTimeZone } from "./time/zoned";
import { fuzzySearch } from "./search/fuzzy";
import { maxPriorityForZoom, resolveLabelCollisions } from "./map/labels";
import { buildShareQuery, parseShareQuery } from "./share";
import { migrateBookmarks } from "./store/bookmarks";
import { DEFAULT_SETTINGS } from "./store/settings";
import { parseImportFile, sanitizeBookmarks, sanitizeSettings } from "./store/validation";

describe("city data", () => {
  it("has ~150 cities with unique slugs and valid IANA zones", () => {
    expect(CITIES.length).toBeGreaterThanOrEqual(140);
    expect(CITY_BY_ID.size).toBe(CITIES.length);
    for (const c of CITIES) {
      expect(isValidTimeZone(c.timeZone), c.timeZone).toBe(true);
      expect(c.slug).toMatch(/^[a-z0-9-]+$/);
      expect(Math.abs(c.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(c.lon)).toBeLessThanOrEqual(180);
    }
  });

  it("includes the unusual-offset cities from the spec", () => {
    for (const id of [
      "kathmandu",
      "new-delhi",
      "mumbai",
      "adelaide",
      "chatham-islands",
      "lord-howe-island",
      "st-johns",
      "kiritimati",
    ]) {
      expect(CITY_BY_ID.has(id), id).toBe(true);
    }
  });

  it("builds flag emoji from country codes", () => {
    expect(flagEmoji("PK")).toBe("🇵🇰");
    expect(flagEmoji("x")).toBe("");
  });
});

describe("fuzzy search", () => {
  const entries = CITIES.map((c) => ({
    item: c,
    fields: [
      { value: c.name, weight: 1 },
      { value: c.country, weight: 0.7 },
      { value: c.timeZone, weight: 0.5 },
    ],
  }));

  it("ranks exact and prefix matches first", () => {
    expect(fuzzySearch("karachi", entries)[0]?.item.id).toBe("karachi");
    expect(fuzzySearch("tok", entries)[0]?.item.id).toBe("tokyo");
  });

  it("tolerates accents and gaps", () => {
    expect(fuzzySearch("sao paulo", entries)[0]?.item.id).toBe("sao-paulo");
    expect(fuzzySearch("bgta", entries).some((r) => r.item.id === "bogota")).toBe(true);
  });

  it("matches by country and zone", () => {
    expect(fuzzySearch("nepal", entries)[0]?.item.id).toBe("kathmandu");
    expect(fuzzySearch("Asia/Kolkata", entries).map((r) => r.item.id)).toContain("mumbai");
  });

  it("returns nothing for empty queries", () => {
    expect(fuzzySearch("   ", entries)).toEqual([]);
  });
});

describe("label collisions", () => {
  it("reveals more priorities as zoom increases", () => {
    expect(maxPriorityForZoom(1)).toBe(1);
    expect(maxPriorityForZoom(2)).toBe(2);
    expect(maxPriorityForZoom(5)).toBe(3);
  });

  it("hides the lower-ranked of two overlapping labels", () => {
    const vis = resolveLabelCollisions(
      [
        { id: "a", x: 100, y: 100, width: 60, height: 24, rank: 2 },
        { id: "b", x: 110, y: 105, width: 60, height: 24, rank: 1 },
        { id: "c", x: 400, y: 100, width: 60, height: 24, rank: 3 },
      ],
      { width: 800, height: 600 },
    );
    expect([...vis].sort()).toEqual(["b", "c"]);
  });

  it("drops labels outside the viewport", () => {
    const vis = resolveLabelCollisions(
      [{ id: "off", x: -500, y: 10, width: 50, height: 20, rank: 1 }],
      { width: 800, height: 600 },
    );
    expect(vis.size).toBe(0);
  });
});

describe("share URL", () => {
  it("round-trips a moment", () => {
    const q = buildShareQuery({ city: "karachi", at: "2026-11-26T15:00", name: "Team standup" });
    expect(parseShareQuery(q)).toEqual({
      city: "karachi",
      at: "2026-11-26T15:00",
      name: "Team standup",
    });
  });

  it("rejects unknown cities, bad dates and missing params", () => {
    expect(parseShareQuery("city=atlantis&at=2026-11-26T15:00")).toBeNull();
    expect(parseShareQuery("city=karachi&at=2026-13-40T99:00")).toBeNull();
    expect(parseShareQuery("city=karachi")).toBeNull();
    expect(parseShareQuery("")).toBeNull();
  });
});

describe("persisted state validation", () => {
  it("settings: keeps valid fields, replaces invalid ones with defaults", () => {
    expect(sanitizeSettings({ theme: "light", hour12: "yes", showSeconds: false })).toEqual({
      ...DEFAULT_SETTINGS,
      theme: "light",
      showSeconds: false,
    });
    expect(sanitizeSettings("garbage")).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("bookmarks: drops invalid and duplicate entries without throwing", () => {
    const out = sanitizeBookmarks({
      cities: [
        { cityId: "tokyo", addedAt: 1 },
        { cityId: "tokyo", addedAt: 2 },
        { cityId: "atlantis", addedAt: 3 },
        42,
      ],
      moments: [{ id: "m1", name: "", cityId: "tokyo", local: "2026-11-26T15:00", createdAt: 1 }],
    });
    expect(out.cities.map((c) => c.cityId)).toEqual(["tokyo"]);
    expect(out.moments).toEqual([]);
    expect(sanitizeBookmarks(undefined)).toEqual({ cities: [], moments: [] });
  });

  it("bookmarks: migrates v1 string-array cities", () => {
    const migrated = migrateBookmarks({ cities: ["london", "paris"], moments: [] }, 1);
    expect(sanitizeBookmarks(migrated).cities.map((c) => c.cityId)).toEqual(["london", "paris"]);
  });

  it("import: validates the file envelope and reports dropped items", () => {
    const file = JSON.stringify({
      app: "world-clock",
      version: 1,
      cities: [
        { cityId: "lima", addedAt: 1 },
        { cityId: "nowhere", addedAt: 1 },
      ],
      moments: [],
    });
    const parsed = parseImportFile(file);
    expect(parsed.data.cities).toHaveLength(1);
    expect(parsed.droppedCities).toBe(1);
    expect(() => parseImportFile("{nope")).toThrow(/valid JSON/);
    expect(() => parseImportFile('{"app":"other"}')).toThrow(/World Clock export/);
  });
});
