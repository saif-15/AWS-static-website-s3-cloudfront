"use client";

import { useEffect, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, LazyMotion, MotionConfig } from "motion/react";
import { useBookmarks } from "@/lib/store/bookmarks";
import { SETTINGS_KEY, useSettings } from "@/lib/store/settings";
import { startTicker } from "@/lib/store/ticker";
import { useUI } from "@/lib/store/ui";

// Lazy: only fetched the first time the palette opens.
const SearchPalette = dynamic(
  () => import("./search/search-palette").then((m) => m.SearchPalette),
  {
    ssr: false,
  },
);

const loadMotionFeatures = () => import("./motion-features").then((m) => m.default);

function applyTheme(theme: "dark" | "light") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function Providers({ children }: { children: ReactNode }) {
  const searchOpen = useUI((s) => s.searchOpen);

  // One global ticker for the whole app.
  useEffect(() => startTicker(), []);

  // Rehydrate persisted stores after mount (keeps first paint == static HTML).
  // Validators (Zod) load first; the stores neither merge nor write before that.
  useEffect(() => {
    let alive = true;
    let unsubscribe: (() => void) | undefined;
    void import("@/lib/store/validation").then(async ({ installValidators }) => {
      if (!alive) return;
      let firstVisit = false;
      try {
        firstVisit = window.localStorage.getItem(SETTINGS_KEY) === null;
      } catch {
        /* storage unavailable */
      }
      installValidators();
      await Promise.all([useSettings.persist.rehydrate(), useBookmarks.persist.rehydrate()]);
      if (!alive) return;
      if (firstVisit) {
        // Default the clock format to the user's locale on first visit.
        const { hour12 } = new Intl.DateTimeFormat(undefined, {
          hour: "numeric",
        }).resolvedOptions();
        if (hour12) useSettings.getState().set("hour12", true);
      }
      applyTheme(useSettings.getState().theme);
      unsubscribe = useSettings.subscribe((s, prev) => {
        if (s.theme !== prev.theme) applyTheme(s.theme);
      });
    });
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, []);

  // Global shortcuts: Ctrl/Cmd+K and "/" open search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUI.getState();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ui.setSearchOpen(!ui.searchOpen);
        return;
      }
      const el = e.target as HTMLElement | null;
      const typing =
        !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
      if (e.key === "/" && !typing && !ui.searchOpen) {
        e.preventDefault();
        ui.setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        {children}
        <AnimatePresence>{searchOpen && <SearchPalette key="search" />}</AnimatePresence>
      </MotionConfig>
    </LazyMotion>
  );
}
