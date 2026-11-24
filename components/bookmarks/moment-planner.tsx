"use client";

import { useMemo, useState } from "react";
import { CITIES, CITY_BY_ID, type City } from "@/data/cities";
import { CheckIcon, LinkIcon } from "@/components/ui/icons";
import { useUserTimeZone } from "@/lib/hooks";
import { defaultMomentLocal, momentInstant } from "@/lib/moments";
import { buildShareQuery } from "@/lib/share";
import { useBookmarks } from "@/lib/store/bookmarks";
import { localDateTimeSchema, momentDraftSchema } from "@/lib/store/schemas";
import { formatLongDate, formatTime } from "@/lib/time";
import { useSettings } from "@/lib/store/settings";
import { ConversionTable, type ConversionRow } from "./conversion-table";
import { useCopy } from "./use-copy";

export interface PlannerSeed {
  cityId?: string;
  local?: string;
  name?: string;
  note?: string;
}

const SORTED = [...CITIES].sort((a, b) => a.name.localeCompare(b.name));

function defaultCity(bookmarkIds: string[], userTz: string | null): string {
  return bookmarkIds[0] ?? CITIES.find((c) => c.timeZone === userTz)?.id ?? "london";
}

/**
 * "Tomorrow 3:00 PM in Karachi" → equivalent time in every bookmarked city.
 * Can be saved as a named moment or shared as a validated URL.
 */
export function MomentPlanner({ seed }: { seed?: PlannerSeed }) {
  const bookmarks = useBookmarks((s) => s.cities);
  const addMoment = useBookmarks((s) => s.addMoment);
  const hour12 = useSettings((s) => s.hour12);
  const userTz = useUserTimeZone();
  const [cityId, setCityId] = useState(
    () =>
      seed?.cityId ??
      defaultCity(
        bookmarks.map((b) => b.cityId),
        userTz,
      ),
  );
  const city = CITY_BY_ID.get(cityId) as City;
  const [local, setLocal] = useState(
    () => seed?.local ?? defaultMomentLocal(Date.now(), city.timeZone),
  );
  const [name, setName] = useState(seed?.name ?? "");
  const [note, setNote] = useState(seed?.note ?? "");
  const [saved, setSaved] = useState(false);
  const { copied, copy } = useCopy();

  const validLocal = localDateTimeSchema.safeParse(local).success;
  const instant = validLocal ? momentInstant(local, city.timeZone) : null;

  const rows = useMemo<ConversionRow[]>(() => {
    const list: ConversionRow[] = [
      {
        key: `src-${city.id}`,
        name: city.name,
        sub: `${city.country} · picked city`,
        timeZone: city.timeZone,
        city,
        highlight: true,
      },
    ];
    for (const b of bookmarks) {
      const c = CITY_BY_ID.get(b.cityId);
      if (!c || c.id === city.id) continue;
      list.push({
        key: c.id,
        name: b.label || c.name,
        sub: b.label ? c.name : c.country,
        timeZone: c.timeZone,
        city: c,
      });
    }
    if (userTz)
      list.push({ key: "you", name: "You", sub: userTz.replace(/_/g, " "), timeZone: userTz });
    return list;
  }, [bookmarks, city, userTz]);

  const draft = { name: name.trim(), note: note.trim() || undefined, cityId, local };
  const canSave = momentDraftSchema.safeParse(draft).success;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave) return;
          addMoment(draft);
          setSaved(true);
          setTimeout(() => setSaved(false), 2200);
        }}
      >
        <div>
          <label htmlFor="moment-city" className="mb-1.5 block text-sm font-medium">
            City
          </label>
          <select
            id="moment-city"
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-accent"
          >
            {bookmarks.length > 0 && (
              <optgroup label="My Clocks">
                {bookmarks.map((b) => {
                  const c = CITY_BY_ID.get(b.cityId);
                  return c ? (
                    <option key={`bm-${c.id}`} value={c.id}>
                      {b.label || c.name}
                    </option>
                  ) : null;
                })}
              </optgroup>
            )}
            <optgroup label="All cities">
              {SORTED.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}, {c.country}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <label htmlFor="moment-time" className="mb-1.5 block text-sm font-medium">
            Date &amp; time in {city.name}
          </label>
          <input
            id="moment-time"
            type="datetime-local"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            aria-invalid={!validLocal}
            className="time-nums h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-accent"
          />
          {instant !== null && (
            <p className="mt-1.5 text-xs text-fg-muted">
              {formatLongDate(instant, city.timeZone)},{" "}
              {formatTime(instant, city.timeZone, { hour12, seconds: false })}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="moment-name" className="mb-1.5 block text-sm font-medium">
            Name <span className="font-normal text-fg-muted">(to save)</span>
          </label>
          <input
            id="moment-name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="Team standup"
            className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor="moment-note" className="mb-1.5 block text-sm font-medium">
            Note <span className="font-normal text-fg-muted">(optional)</span>
          </label>
          <textarea
            id="moment-note"
            value={note}
            maxLength={500}
            rows={2}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={!canSave}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg disabled:opacity-40"
          >
            {saved ? <CheckIcon size={16} /> : null}
            {saved ? "Saved" : "Save moment"}
          </button>
          <button
            type="button"
            disabled={!validLocal}
            onClick={() =>
              copy(
                `${window.location.origin}/bookmarks/?${buildShareQuery({
                  city: cityId,
                  at: local,
                  name: name.trim() || undefined,
                  note: note.trim() || undefined,
                })}`,
              )
            }
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface-2 disabled:opacity-40"
          >
            {copied ? <CheckIcon size={16} /> : <LinkIcon size={16} />}
            {copied ? "Link copied" : "Copy share link"}
          </button>
        </div>
        <p className="sr-only" role="status">
          {saved ? "Moment saved." : copied ? "Share link copied to clipboard." : ""}
        </p>
      </form>

      <div>
        <h3 className="mb-3 text-sm font-medium text-fg-muted">
          {bookmarks.length ? "Across My Clocks" : "Star cities to compare them here"}
        </h3>
        {instant !== null ? (
          <ConversionTable instant={instant} sourceZone={city.timeZone} rows={rows} />
        ) : (
          <p className="rounded-2xl border border-border p-4 text-sm text-fg-muted">
            Pick a valid date and time.
          </p>
        )}
      </div>
    </div>
  );
}
