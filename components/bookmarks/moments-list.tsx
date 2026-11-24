"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { CITY_BY_ID } from "@/data/cities";
import { CalendarIcon, CheckIcon, LinkIcon, PencilIcon, TrashIcon } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/primitives";
import { formatRelative, momentInstant } from "@/lib/moments";
import { buildShareQuery } from "@/lib/share";
import { useBookmarks } from "@/lib/store/bookmarks";
import { momentSchema, type Moment } from "@/lib/store/schemas";
import { useSettings } from "@/lib/store/settings";
import { useMinute } from "@/lib/store/ticker";
import { formatShortDate, formatTime } from "@/lib/time";
import { ConversionTable, type ConversionRow } from "./conversion-table";
import { useCopy } from "./use-copy";
import type { PlannerSeed } from "./moment-planner";

function MomentCard({ moment, onOpen }: { moment: Moment; onOpen: (seed: PlannerSeed) => void }) {
  const city = CITY_BY_ID.get(moment.cityId);
  const bookmarks = useBookmarks((s) => s.cities);
  const removeMoment = useBookmarks((s) => s.removeMoment);
  const updateMoment = useBookmarks((s) => s.updateMoment);
  const hour12 = useSettings((s) => s.hour12);
  const minute = useMinute();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(moment.name);
  const [note, setNote] = useState(moment.note ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { copied, copy } = useCopy();
  if (!city) return null;

  const instant = momentInstant(moment.local, city.timeZone);
  const rows: ConversionRow[] = bookmarks.flatMap((b) => {
    const c = CITY_BY_ID.get(b.cityId);
    return c && c.id !== city.id
      ? [{ key: c.id, name: b.label || c.name, sub: c.country, timeZone: c.timeZone, city: c }]
      : [];
  });
  const editValid =
    momentSchema.shape.name.safeParse(name).success &&
    momentSchema.shape.note.safeParse(note || undefined).success;

  return (
    <m.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="rounded-3xl border border-border bg-surface p-5"
    >
      {editing ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!editValid) return;
            updateMoment(moment.id, { name: name.trim(), note: note.trim() || undefined });
            setEditing(false);
          }}
        >
          <label className="sr-only" htmlFor={`mn-${moment.id}`}>
            Moment name
          </label>
          <input
            id={`mn-${moment.id}`}
            autoFocus
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent"
          />
          <label className="sr-only" htmlFor={`mo-${moment.id}`}>
            Note
          </label>
          <textarea
            id={`mo-${moment.id}`}
            value={note}
            maxLength={500}
            rows={2}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!editValid}
              className="rounded-xl bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg disabled:opacity-40"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl px-3 py-1.5 text-sm text-fg-muted hover:bg-surface-2"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-start gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent"
            aria-hidden
          >
            <CalendarIcon />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold">{moment.name}</h3>
            <p className="time-nums text-sm text-fg-muted">
              {formatShortDate(instant, city.timeZone)} ·{" "}
              {formatTime(instant, city.timeZone, { hour12, seconds: false })} in {city.name}
              {minute !== null && (
                <span className="ml-2 text-accent">({formatRelative(instant, minute)})</span>
              )}
            </p>
            {moment.note && <p className="mt-1 whitespace-pre-line text-sm">{moment.note}</p>}
          </div>
          <div className="flex shrink-0">
            <IconButton
              label={copied ? "Link copied" : `Copy share link for ${moment.name}`}
              variant="ghost"
              size="sm"
              onClick={() =>
                copy(
                  `${window.location.origin}/bookmarks/?${buildShareQuery({
                    city: moment.cityId,
                    at: moment.local,
                    name: moment.name,
                    note: moment.note,
                  })}`,
                )
              }
            >
              {copied ? <CheckIcon size={15} /> : <LinkIcon size={15} />}
            </IconButton>
            <IconButton
              label={`Edit ${moment.name}`}
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <PencilIcon size={15} />
            </IconButton>
            <IconButton
              label={confirmDelete ? `Confirm delete ${moment.name}` : `Delete ${moment.name}`}
              variant="ghost"
              size="sm"
              className={confirmDelete ? "bg-red-500/15 text-red-600 dark:text-red-300" : undefined}
              onClick={() => (confirmDelete ? removeMoment(moment.id) : setConfirmDelete(true))}
              onBlur={() => setConfirmDelete(false)}
            >
              <TrashIcon size={15} />
            </IconButton>
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        {rows.length > 0 && (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            className="text-fg-muted hover:text-accent"
          >
            {expanded ? "Hide" : "Show"} times in My Clocks ({rows.length})
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            onOpen({
              cityId: moment.cityId,
              local: moment.local,
              name: moment.name,
              note: moment.note,
            })
          }
          className="text-fg-muted hover:text-accent"
        >
          Open in planner
        </button>
      </div>
      <AnimatePresence initial={false}>
        {expanded && rows.length > 0 && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              <ConversionTable instant={instant} sourceZone={city.timeZone} rows={rows} />
            </div>
          </m.div>
        )}
      </AnimatePresence>
      <p className="sr-only" role="status">
        {copied ? "Share link copied." : ""}
      </p>
    </m.li>
  );
}

export function MomentsList({ onOpen }: { onOpen: (seed: PlannerSeed) => void }) {
  const moments = useBookmarks((s) => s.moments);
  if (moments.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-fg-muted">
        No saved moments yet. Plan one above and give it a name.
      </p>
    );
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      <AnimatePresence initial={false}>
        {moments.map((mo) => (
          <MomentCard key={mo.id} moment={mo} onOpen={onOpen} />
        ))}
      </AnimatePresence>
    </ul>
  );
}
