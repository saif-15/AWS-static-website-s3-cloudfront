"use client";

import { create } from "zustand";

/**
 * The ONE global ticker. It fires on each wall-clock second boundary and every
 * clock in the app derives from `now` via selectors, so components only
 * re-render when their *formatted* output changes.
 *
 * `now` is null until the ticker starts after mount, which keeps the server/
 * first-paint HTML stable (no hydration mismatch).
 */
interface TickerState {
  now: number | null;
}

export const useTicker = create<TickerState>(() => ({ now: null }));

let timer: ReturnType<typeof setTimeout> | null = null;
let refs = 0;

function tick() {
  const now = Date.now();
  useTicker.setState({ now });
  // Re-align to the next second boundary every tick (self-correcting drift).
  timer = setTimeout(tick, 1000 - (now % 1000) + 2);
}

function stop() {
  if (timer !== null) clearTimeout(timer);
  timer = null;
}

function onVisibility() {
  const hidden = document.visibilityState === "hidden";
  // Lets CSS pause decorative animations too (see globals.css).
  document.documentElement.toggleAttribute("data-tab-hidden", hidden);
  if (hidden) stop();
  else if (timer === null) tick(); // resync immediately on return
}

/** Start the shared ticker. Ref-counted; returns a disposer. */
export function startTicker(): () => void {
  refs += 1;
  if (refs === 1) {
    document.addEventListener("visibilitychange", onVisibility);
    if (document.visibilityState !== "hidden") tick();
  }
  return () => {
    refs -= 1;
    if (refs === 0) {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    }
  };
}

/** Current ms, updated every second (null before mount). */
export function useNow(): number | null {
  return useTicker((s) => s.now);
}

/** Current ms floored to the minute — re-renders once per minute. */
export function useMinute(): number | null {
  return useTicker((s) => (s.now === null ? null : Math.floor(s.now / 60_000) * 60_000));
}

/** Subscribe to a derived value; re-renders only when the derived value changes. */
export function useTicked<T>(derive: (now: number) => T): T | null {
  return useTicker((s) => (s.now === null ? null : derive(s.now)));
}
