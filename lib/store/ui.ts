"use client";

import { create } from "zustand";

/** Ephemeral UI state (not persisted). */
interface UIState {
  selectedCityId: string | null;
  hoveredCityId: string | null;
  searchOpen: boolean;
  listOpen: boolean;
  settingsOpen: boolean;
  /** Incrementing request; the map flies when `nonce` changes. */
  flyRequest: { cityId: string; nonce: number } | null;
  selectCity: (id: string | null, opts?: { fly?: boolean }) => void;
  setHovered: (id: string | null) => void;
  setSearchOpen: (open: boolean) => void;
  setListOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
}

export const useUI = create<UIState>((set, get) => ({
  selectedCityId: null,
  hoveredCityId: null,
  searchOpen: false,
  listOpen: false,
  settingsOpen: false,
  flyRequest: null,
  selectCity: (id, opts) =>
    set({
      selectedCityId: id,
      ...(id && opts?.fly
        ? { flyRequest: { cityId: id, nonce: (get().flyRequest?.nonce ?? 0) + 1 } }
        : {}),
    }),
  setHovered: (id) => set({ hoveredCityId: id }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setListOpen: (open) => set({ listOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
}));
