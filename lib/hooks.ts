"use client";

import { useSyncExternalStore } from "react";
import { getUserTimeZone } from "./time/zoned";

const noopSubscribe = () => () => {};

/** User's IANA zone on the client; null on the server and during hydration. */
export function useUserTimeZone(): string | null {
  return useSyncExternalStore(noopSubscribe, getUserTimeZone, () => null);
}

/** true once hydrated on the client. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Current `location.search` (client only, "" on server/hydration). */
export function useLocationSearch(): string {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("popstate", cb);
      return () => window.removeEventListener("popstate", cb);
    },
    () => window.location.search,
    () => "",
  );
}

export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)", true);
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
