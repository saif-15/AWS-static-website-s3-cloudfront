"use client";

import { useSyncExternalStore } from "react";
import { useBookmarks } from "./bookmarks";

/** true once persisted bookmarks have been loaded from localStorage. */
export function useBookmarksHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useBookmarks.persist.onFinishHydration(cb),
    () => useBookmarks.persist.hasHydrated(),
    () => false,
  );
}
