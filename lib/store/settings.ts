"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Settings } from "./schemas";
import { persistedState, safeJSONStorage } from "./safe-storage";

import { SETTINGS_KEY } from "./keys";
export { SETTINGS_KEY };
export const SETTINGS_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  hour12: false,
  showSeconds: true,
  showTerminator: true,
};

interface SettingsActions {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
}

/** Installed by ./validation before rehydrate(); until then nothing is merged. */
let rehydrated = false;
let sanitizer: ((input: unknown) => Settings) | null = null;
export function setSettingsSanitizer(fn: (input: unknown) => Settings) {
  sanitizer = fn;
}

export const useSettings = create<Settings & SettingsActions>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (key, value) => set({ [key]: value } as Partial<Settings>),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: SETTINGS_KEY,
      version: SETTINGS_VERSION,
      storage: safeJSONStorage<Settings>(() => rehydrated),
      onRehydrateStorage: () => () => {
        rehydrated = true;
      },
      // Rehydrated manually after mount so first paint matches the static HTML.
      skipHydration: true,
      partialize: (s) => ({
        theme: s.theme,
        hour12: s.hour12,
        showSeconds: s.showSeconds,
        showTerminator: s.showTerminator,
      }),
      // v0 -> v1: no shape change; `merge` validates whatever comes back.
      migrate: (persisted) => persisted as Settings,
      merge: (persisted, current) =>
        sanitizer ? { ...current, ...sanitizer(persistedState(persisted)) } : current,
    },
  ),
);
