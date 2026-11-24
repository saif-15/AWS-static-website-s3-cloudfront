/**
 * Zod-backed validation for persisted state and imported files.
 * Loaded on demand (dynamic import) so Zod isn't part of the initial bundle;
 * the persisted stores refuse to merge or write until `installValidators()` ran.
 */
import { setBookmarksSanitizer, type BookmarksData } from "./bookmarks";
import {
  cityBookmarkSchema,
  EXPORT_VERSION,
  exportFileSchema,
  momentSchema,
  parseList,
  partialSettingsSchema,
  settingsSchema,
  type Settings,
} from "./schemas";
import { DEFAULT_SETTINGS, setSettingsSanitizer } from "./settings";

export function sanitizeBookmarks(input: unknown): BookmarksData {
  const obj = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    cities: parseList(obj.cities, cityBookmarkSchema, (c) => c.cityId),
    moments: parseList(obj.moments, momentSchema, (m) => m.id),
  };
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** Validate an unknown persisted value field-by-field; invalid fields fall back to defaults. */
export function sanitizeSettings(input: unknown): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  if (!input || typeof input !== "object") return out;
  const partial = partialSettingsSchema.safeParse(input);
  if (partial.success) return { ...out, ...stripUndefined(partial.data) };
  // Some fields are bad: salvage the good ones individually.
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const r = settingsSchema.shape[key].safeParse((input as Record<string, unknown>)[key]);
    if (r.success) (out as Record<keyof Settings, unknown>)[key] = r.data;
  }
  return out;
}

export interface ParsedImport {
  data: BookmarksData;
  droppedCities: number;
  droppedMoments: number;
}

/** Validate an imported JSON file. Throws a readable Error on structural failure. */
export function parseImportFile(text: string): ParsedImport {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const file = exportFileSchema.safeParse(json);
  if (!file.success) {
    throw new Error("That doesn't look like a World Clock export (version 1).");
  }
  const data = sanitizeBookmarks(file.data);
  return {
    data,
    droppedCities: file.data.cities.length - data.cities.length,
    droppedMoments: file.data.moments.length - data.moments.length,
  };
}

export function buildExportFile(data: BookmarksData) {
  return {
    app: "world-clock" as const,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    cities: data.cities,
    moments: data.moments,
  };
}

export function installValidators() {
  setBookmarksSanitizer(sanitizeBookmarks);
  setSettingsSanitizer(sanitizeSettings);
}
