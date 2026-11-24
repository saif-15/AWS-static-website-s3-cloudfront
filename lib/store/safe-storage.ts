import { createJSONStorage, type PersistStorage } from "zustand/middleware";

/**
 * localStorage wrapper that never throws: unavailable storage (private mode,
 * quota, SSR) and corrupt JSON are treated as "nothing stored". Schema
 * validation happens in each store's `merge`. Writes are blocked until the
 * store has rehydrated, so early interactions can't clobber saved data.
 */
export function safeJSONStorage<S>(
  canWrite: () => boolean = () => true,
): PersistStorage<S> | undefined {
  return createJSONStorage<S>(() => ({
    getItem: (name) => {
      try {
        const raw = window.localStorage.getItem(name);
        if (raw === null) return null;
        JSON.parse(raw); // corrupted JSON -> drop it
        return raw;
      } catch {
        try {
          window.localStorage.removeItem(name);
        } catch {
          /* storage unavailable — nothing to clean up */
        }
        return null;
      }
    },
    setItem: (name, value) => {
      // Until rehydration has validated what's stored, never overwrite it.
      if (!canWrite()) return;
      try {
        window.localStorage.setItem(name, value);
      } catch {
        /* quota exceeded / unavailable — keep in-memory state */
      }
    },
    removeItem: (name) => {
      try {
        window.localStorage.removeItem(name);
      } catch {
        /* unavailable */
      }
    },
  }));
}

/** Extracts `.state` from an unknown persisted envelope. */
export function persistedState(persisted: unknown): unknown {
  if (persisted && typeof persisted === "object" && "state" in persisted) {
    return (persisted as { state: unknown }).state;
  }
  return persisted;
}
