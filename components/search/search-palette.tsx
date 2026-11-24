"use client";

import { useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as m from "motion/react-m";
import { CITIES, flagEmoji, type City } from "@/data/cities";
import { fuzzySearch, type Searchable } from "@/lib/search/fuzzy";
import { useBookmarks } from "@/lib/store/bookmarks";
import { useSettings } from "@/lib/store/settings";
import { useMinute } from "@/lib/store/ticker";
import { useUI } from "@/lib/store/ui";
import { formatOffset, formatTime, getOffsetMinutes, getTimeZoneAbbreviation } from "@/lib/time";
import { SearchIcon, StarIcon } from "@/components/ui/icons";
import { Kbd, cx } from "@/components/ui/primitives";
import { useDialog } from "@/components/ui/use-dialog";

interface Row {
  city: City;
  abbr: string;
  offset: number;
}

/** Command palette (Ctrl/Cmd+K): fuzzy search on city, country, zone and abbreviation. */
export function SearchPalette() {
  const setOpen = useUI((s) => s.setSearchOpen);
  const selectCity = useUI((s) => s.selectCity);
  const toggleBookmark = useBookmarks((s) => s.toggleCity);
  const bookmarks = useBookmarks((s) => s.cities);
  const hour12 = useSettings((s) => s.hour12);
  const router = useRouter();
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  // Snapshot "now" when the palette opens — abbreviations/offsets for display.
  const [openedAt] = useState(() => Date.now());
  const minute = useMinute();

  const close = () => setOpen(false);
  useDialog(dialogRef, close);

  const index = useMemo<Searchable<Row>[]>(
    () =>
      CITIES.map((city) => {
        const abbr = getTimeZoneAbbreviation(openedAt, city.timeZone);
        return {
          item: { city, abbr, offset: getOffsetMinutes(openedAt, city.timeZone) },
          fields: [
            { value: city.name, weight: 1 },
            { value: city.country, weight: 0.75 },
            { value: abbr.startsWith("GMT") ? "" : abbr, weight: 0.9 },
            { value: city.timeZone, weight: 0.55 },
            { value: city.countryCode, weight: 0.5 },
          ],
        };
      }),
    [openedAt],
  );

  const bookmarkedIds = useMemo(() => new Set(bookmarks.map((b) => b.cityId)), [bookmarks]);

  const results: Row[] = useMemo(() => {
    if (query.trim()) return fuzzySearch(query, index, 30).map((r) => r.item);
    // Suggestions: bookmarks first, then the major cities.
    const items = index.map((e) => e.item);
    const bm = items.filter((r) => bookmarkedIds.has(r.city.id));
    const top = items.filter((r) => r.city.priority === 1 && !bookmarkedIds.has(r.city.id));
    return [...bm, ...top].slice(0, 30);
  }, [query, index, bookmarkedIds]);

  const choose = (row: Row | undefined) => {
    if (!row) return;
    close();
    if (pathname === "/") selectCity(row.city.id, { fly: true });
    else router.push(`/?city=${row.city.id}`);
  };

  const safeActive = Math.min(active, Math.max(0, results.length - 1));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-[12vh]">
      <m.div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
        aria-hidden
      />
      <m.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search cities"
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.12 } }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        className="glass-strong relative w-full max-w-xl overflow-hidden rounded-3xl shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <SearchIcon className="text-fg-muted" />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results"
            aria-activedescendant={
              results[safeActive] ? `sr-${results[safeActive].city.id}` : undefined
            }
            aria-autocomplete="list"
            aria-label="Search cities, countries, or time zones"
            placeholder="Search cities, countries, zones (e.g. PST, Nepal)…"
            className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-fg-muted"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && e.shiftKey) {
                e.preventDefault();
                const r = results[safeActive];
                if (r) toggleBookmark(r.city.id);
              } else if (e.key === "Enter") {
                e.preventDefault();
                choose(results[safeActive]);
              }
            }}
          />
          <Kbd>Esc</Kbd>
        </div>

        <p
          className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-fg-muted"
          aria-live="polite"
        >
          {query.trim()
            ? results.length
              ? `${results.length} result${results.length === 1 ? "" : "s"}`
              : "No matches"
            : "Suggestions"}
        </p>
        <ul
          id="search-results"
          role="listbox"
          aria-label="Cities"
          className="max-h-[50vh] overflow-y-auto px-2 pb-2"
        >
          {results.map((r, i) => {
            const isBm = bookmarkedIds.has(r.city.id);
            return (
              <li
                key={r.city.id}
                id={`sr-${r.city.id}`}
                role="option"
                aria-selected={i === safeActive}
                onMouseMove={() => setActive(i)}
                onClick={() => choose(r)}
                className={cx(
                  "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5",
                  i === safeActive && "bg-surface-2",
                )}
              >
                <span aria-hidden className="text-xl leading-none">
                  {flagEmoji(r.city.countryCode)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.city.name}</span>
                  <span className="block truncate text-xs text-fg-muted">
                    {r.city.country} · {r.city.timeZone.replace(/_/g, " ")}
                    {r.abbr.startsWith("GMT") ? "" : ` · ${r.abbr}`}
                  </span>
                </span>
                <span className="time-nums text-right">
                  <span className="block text-sm">
                    {formatTime(minute ?? openedAt, r.city.timeZone, { hour12, seconds: false })}
                  </span>
                  <span className="block text-[11px] text-fg-muted">{formatOffset(r.offset)}</span>
                </span>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  title={
                    isBm ? "Remove from My Clocks (Shift+Enter)" : "Add to My Clocks (Shift+Enter)"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark(r.city.id);
                  }}
                  className={cx(
                    "grid size-8 place-items-center rounded-lg hover:bg-surface",
                    isBm ? "text-accent" : "text-fg-muted",
                  )}
                >
                  <StarIcon filled={isBm} size={16} />
                </button>
                {isBm && <span className="sr-only">(in My Clocks)</span>}
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2.5 text-xs text-fg-muted">
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> navigate
          </span>
          <span>
            <Kbd>Enter</Kbd> fly to city
          </span>
          <span>
            <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> star
          </span>
        </div>
      </m.div>
    </div>
  );
}
