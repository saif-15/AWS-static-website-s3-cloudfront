"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
// Type-only import: the Zod schemas live in ./validation, which is loaded
// lazily before rehydration so Zod stays out of the initial bundle.
import type { CityBookmark, Moment } from "./schemas";
import { persistedState, safeJSONStorage } from "./safe-storage";

import { BOOKMARKS_KEY } from "./keys";
export { BOOKMARKS_KEY };
export const BOOKMARKS_VERSION = 2;

export interface BookmarksData {
  cities: CityBookmark[];
  moments: Moment[];
}

interface BookmarksActions {
  toggleCity: (cityId: string) => boolean;
  removeCity: (cityId: string) => void;
  setLabel: (cityId: string, label: string) => void;
  moveCity: (fromId: string, toId: string) => void;
  addMoment: (m: Omit<Moment, "id" | "createdAt">) => Moment;
  updateMoment: (id: string, patch: Partial<Pick<Moment, "name" | "note">>) => void;
  removeMoment: (id: string) => void;
  importData: (data: BookmarksData, mode: "merge" | "replace") => void;
}

/** Installed by ./validation before rehydrate(); until then nothing is merged. */
let rehydrated = false;
let sanitizer: ((input: unknown) => BookmarksData) | null = null;
export function setBookmarksSanitizer(fn: (input: unknown) => BookmarksData) {
  sanitizer = fn;
}

/**
 * Versioned migrations. v1 stored `cities` as a plain array of city ids.
 * Anything unrecognised is passed through and filtered by `sanitizeBookmarks`.
 */
export function migrateBookmarks(persisted: unknown, version: number): unknown {
  if (version < 2 && persisted && typeof persisted === "object") {
    const p = persisted as { cities?: unknown; moments?: unknown };
    if (Array.isArray(p.cities)) {
      return {
        ...p,
        cities: p.cities.map((c, i) => (typeof c === "string" ? { cityId: c, addedAt: i } : c)),
      };
    }
  }
  return persisted;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const useBookmarks = create<BookmarksData & BookmarksActions>()(
  persist(
    (set, get) => ({
      cities: [],
      moments: [],
      toggleCity: (cityId) => {
        const exists = get().cities.some((c) => c.cityId === cityId);
        set((s) => ({
          cities: exists
            ? s.cities.filter((c) => c.cityId !== cityId)
            : [...s.cities, { cityId, addedAt: Date.now() }],
        }));
        return !exists;
      },
      removeCity: (cityId) => set((s) => ({ cities: s.cities.filter((c) => c.cityId !== cityId) })),
      setLabel: (cityId, label) =>
        set((s) => ({
          cities: s.cities.map((c) =>
            c.cityId === cityId ? { ...c, label: label.trim().slice(0, 60) || undefined } : c,
          ),
        })),
      moveCity: (fromId, toId) =>
        set((s) => {
          const from = s.cities.findIndex((c) => c.cityId === fromId);
          const to = s.cities.findIndex((c) => c.cityId === toId);
          if (from < 0 || to < 0 || from === to) return s;
          const next = [...s.cities];
          const [moved] = next.splice(from, 1);
          if (moved) next.splice(to, 0, moved);
          return { cities: next };
        }),
      addMoment: (m) => {
        const moment: Moment = { ...m, id: newId(), createdAt: Date.now() };
        set((s) => ({ moments: [moment, ...s.moments] }));
        return moment;
      },
      updateMoment: (id, patch) =>
        set((s) => ({ moments: s.moments.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      removeMoment: (id) => set((s) => ({ moments: s.moments.filter((m) => m.id !== id) })),
      importData: (data, mode) =>
        set((s) => {
          if (mode === "replace") return { cities: data.cities, moments: data.moments };
          const cityIds = new Set(s.cities.map((c) => c.cityId));
          const momentIds = new Set(s.moments.map((m) => m.id));
          return {
            cities: [...s.cities, ...data.cities.filter((c) => !cityIds.has(c.cityId))],
            moments: [...s.moments, ...data.moments.filter((m) => !momentIds.has(m.id))],
          };
        }),
    }),
    {
      name: BOOKMARKS_KEY,
      version: BOOKMARKS_VERSION,
      storage: safeJSONStorage<BookmarksData>(() => rehydrated),
      onRehydrateStorage: () => () => {
        rehydrated = true;
      },
      skipHydration: true,
      partialize: (s) => ({ cities: s.cities, moments: s.moments }),
      migrate: (persisted, version) => migrateBookmarks(persisted, version) as BookmarksData,
      // Never merge unvalidated data: without the sanitizer, keep defaults.
      merge: (persisted, current) =>
        sanitizer ? { ...current, ...sanitizer(persistedState(persisted)) } : current,
    },
  ),
);

export function useIsBookmarked(cityId: string | null | undefined): boolean {
  return useBookmarks((s) => (cityId ? s.cities.some((c) => c.cityId === cityId) : false));
}
