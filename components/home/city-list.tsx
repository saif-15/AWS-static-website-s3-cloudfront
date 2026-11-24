"use client";

import { useMemo, useRef, useState } from "react";
import * as m from "motion/react-m";
import { CITIES, flagEmoji, type City } from "@/data/cities";
import { BookmarkStar } from "@/components/clock/bookmark-star";
import { LiveTime } from "@/components/clock/live-time";
import { CloseIcon, MoonIcon, SearchIcon, SunIcon } from "@/components/ui/icons";
import { IconButton, cx } from "@/components/ui/primitives";
import { useDialog } from "@/components/ui/use-dialog";
import { useUserTimeZone } from "@/lib/hooks";
import { normalise } from "@/lib/search/fuzzy";
import { useMinute } from "@/lib/store/ticker";
import { useUI } from "@/lib/store/ui";
import { formatOffset, formatSignedDuration, getOffsetMinutes, isDaytime } from "@/lib/time";

type SortKey = "name" | "offset" | "diff";

interface Row {
  city: City;
  offset: number;
  diff: number;
  day: boolean;
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "City" },
  { key: "offset", label: "UTC offset" },
  { key: "diff", label: "From you" },
];

/** Sortable list view — an accessible alternative to the map. */
export function CityList() {
  const setListOpen = useUI((s) => s.setListOpen);
  const selectCity = useUI((s) => s.selectCity);
  const minute = useMinute();
  const userTz = useUserTimeZone();
  const ref = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "offset", dir: 1 });
  const [filter, setFilter] = useState("");

  const close = () => setListOpen(false);
  useDialog(ref, close);

  const rows = useMemo<Row[]>(() => {
    const now = minute ?? 0;
    const userOffset = userTz && minute !== null ? getOffsetMinutes(now, userTz) : 0;
    const q = normalise(filter.trim());
    return CITIES.filter((c) => !q || normalise(`${c.name} ${c.country} ${c.timeZone}`).includes(q))
      .map((city) => {
        const offset = minute === null ? 0 : getOffsetMinutes(now, city.timeZone);
        return { city, offset, diff: offset - userOffset, day: isDaytime(now, city.lat, city.lon) };
      })
      .sort((a, b) => {
        const v =
          sort.key === "name"
            ? a.city.name.localeCompare(b.city.name)
            : sort.key === "offset"
              ? a.offset - b.offset
              : a.diff - b.diff;
        return (v || a.city.name.localeCompare(b.city.name)) * sort.dir;
      });
  }, [minute, userTz, filter, sort]);

  const open = (city: City) => {
    close();
    selectCity(city.id, { fly: true });
  };

  return (
    <m.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="list-title"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="glass-strong fixed inset-x-2 bottom-2 top-[120px] z-40 flex flex-col overflow-hidden rounded-3xl shadow-2xl md:inset-x-auto md:left-1/2 md:top-20 md:bottom-4 md:w-[min(920px,calc(100vw-32px))] md:-translate-x-1/2"
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <h2 id="list-title" className="text-lg font-semibold tracking-tight">
          All cities <span className="text-sm font-normal text-fg-muted">({rows.length})</span>
        </h2>
        <label className="ml-auto flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface-2 px-3 sm:max-w-xs">
          <SearchIcon size={16} className="text-fg-muted" />
          <span className="sr-only">Filter cities</span>
          <input
            autoFocus
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-muted"
          />
        </label>
        <IconButton label="Close list" variant="ghost" onClick={close}>
          <CloseIcon />
        </IconButton>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={
                    sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"
                  }
                  className={cx(
                    "border-b border-border px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted",
                    c.key !== "name" && "hidden sm:table-cell",
                  )}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSort((s) => ({
                        key: c.key,
                        dir: s.key === c.key ? (s.dir === 1 ? -1 : 1) : 1,
                      }))
                    }
                    className="inline-flex items-center gap-1 rounded hover:text-fg"
                  >
                    {c.label}
                    <span aria-hidden className={cx(sort.key !== c.key && "opacity-30")}>
                      {sort.key === c.key && sort.dir === -1 ? "↓" : "↑"}
                    </span>
                  </button>
                </th>
              ))}
              <th
                scope="col"
                className="border-b border-border px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-fg-muted"
              >
                Local time
              </th>
              <th scope="col" className="border-b border-border px-2 py-2">
                <span className="sr-only">Bookmark</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.city.id} className="group hover:bg-surface-2/60">
                <td className="border-b border-border/60 px-4 py-2">
                  <button
                    type="button"
                    onClick={() => open(r.city)}
                    className="flex items-center gap-3 text-left"
                  >
                    <span aria-hidden className="text-lg">
                      {flagEmoji(r.city.countryCode)}
                    </span>
                    <span>
                      <span className="block font-medium group-hover:text-accent">
                        {r.city.name}
                      </span>
                      <span className="block text-xs text-fg-muted">{r.city.country}</span>
                    </span>
                  </button>
                </td>
                <td className="time-nums hidden border-b border-border/60 px-4 py-2 sm:table-cell">
                  {minute === null ? "…" : formatOffset(r.offset)}
                </td>
                <td className="time-nums hidden border-b border-border/60 px-4 py-2 text-fg-muted sm:table-cell">
                  {minute === null ? "…" : r.diff === 0 ? "Same" : formatSignedDuration(r.diff)}
                </td>
                <td className="border-b border-border/60 px-4 py-2 text-right">
                  <span className="inline-flex items-center gap-2">
                    {minute !== null && (
                      <span className="text-fg-muted" title={r.day ? "Daytime" : "Night"}>
                        {r.day ? <SunIcon size={14} /> : <MoonIcon size={14} />}
                        <span className="sr-only">{r.day ? "Daytime" : "Night"}</span>
                      </span>
                    )}
                    <LiveTime
                      timeZone={r.city.timeZone}
                      seconds={false}
                      label={`Time in ${r.city.name}`}
                      className="font-medium"
                    />
                  </span>
                </td>
                <td className="border-b border-border/60 px-2 py-1 text-right">
                  <BookmarkStar cityId={r.city.id} cityName={r.city.name} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </m.div>
  );
}
