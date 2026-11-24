"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CITY_BY_ID, flagEmoji, type City } from "@/data/cities";
import { LiveTime } from "@/components/clock/live-time";
import { CityDate, DayPhaseBadge, useDayPhase } from "@/components/city/city-facts";
import {
  CheckIcon,
  CloseIcon,
  GlobeIcon,
  GripIcon,
  PencilIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { IconButton, cx } from "@/components/ui/primitives";
import { useUserTimeZone } from "@/lib/hooks";
import { useBookmarks } from "@/lib/store/bookmarks";
import { labelSchema, type CityBookmark } from "@/lib/store/schemas";
import { useMinute } from "@/lib/store/ticker";
import { useUI } from "@/lib/store/ui";
import {
  formatOffset,
  formatSignedDuration,
  getOffsetMinutes,
  getTimeDifferenceMinutes,
} from "@/lib/time";

function LabelEditor({ city, label, onDone }: { city: City; label?: string; onDone: () => void }) {
  const setLabel = useBookmarks((s) => s.setLabel);
  const [value, setValue] = useState(label ?? "");
  const parsed = labelSchema.safeParse(value);
  const save = () => {
    if (!parsed.success) return;
    setLabel(city.id, parsed.data);
    onDone();
  };
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <label className="sr-only" htmlFor={`label-${city.id}`}>
        Custom label for {city.name}
      </label>
      <input
        id={`label-${city.id}`}
        autoFocus
        value={value}
        maxLength={60}
        placeholder={`e.g. Mom — ${city.name}`}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onDone()}
        aria-invalid={!parsed.success}
        className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-2.5 text-sm outline-none focus:border-accent"
      />
      <IconButton label="Save label" variant="ghost" size="sm" type="submit">
        <CheckIcon size={16} />
      </IconButton>
      <IconButton label="Cancel" variant="ghost" size="sm" onClick={onDone}>
        <CloseIcon size={16} />
      </IconButton>
    </form>
  );
}

function SortableClockCard({ bookmark, city }: { bookmark: CityBookmark; city: City }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: city.id });
  const removeCity = useBookmarks((s) => s.removeCity);
  const [editing, setEditing] = useState(false);
  const minute = useMinute();
  const userTz = useUserTimeZone();
  const phase = useDayPhase(city);
  const title = bookmark.label || city.name;
  const diff =
    minute !== null && userTz ? getTimeDifferenceMinutes(minute, city.timeZone, userTz) : null;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx(
        "group relative flex flex-col rounded-3xl border border-border bg-surface p-5 shadow-sm transition-shadow",
        isDragging && "z-10 shadow-2xl ring-2 ring-accent",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label={`Reorder ${title}. Press space to pick up, arrow keys to move.`}
          className="-ml-2 grid size-9 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-fg-muted hover:bg-surface-2 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripIcon />
        </button>
        <div className="min-w-0 flex-1">
          {editing ? (
            <LabelEditor city={city} label={bookmark.label} onDone={() => setEditing(false)} />
          ) : (
            <>
              <h3 className="flex items-center gap-2 truncate font-semibold">
                <span aria-hidden>{flagEmoji(city.countryCode)}</span>
                <span className="truncate">{title}</span>
              </h3>
              <p className="truncate text-xs text-fg-muted">
                {bookmark.label ? `${city.name}, ${city.country}` : city.country}
              </p>
            </>
          )}
        </div>
        {!editing && (
          <div className="flex shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
            <IconButton
              label={`Edit label for ${city.name}`}
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <PencilIcon size={15} />
            </IconButton>
            <IconButton
              label={`Remove ${title}`}
              variant="ghost"
              size="sm"
              onClick={() => removeCity(city.id)}
            >
              <TrashIcon size={15} />
            </IconButton>
          </div>
        )}
      </div>

      <LiveTime
        timeZone={city.timeZone}
        label={`Time in ${title}`}
        animated
        focusable
        className="mt-4 text-4xl font-semibold tracking-tight"
      />
      <p className="mt-1 text-sm text-fg-muted">
        <CityDate city={city} />
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="time-nums rounded-full bg-surface-2 px-2.5 py-1">
          {minute === null ? "UTC…" : formatOffset(getOffsetMinutes(minute, city.timeZone))}
        </span>
        <span className="time-nums rounded-full bg-surface-2 px-2.5 py-1 text-fg-muted">
          {diff === null
            ? "…"
            : diff === 0
              ? "Same as you"
              : `${formatSignedDuration(diff)} from you`}
        </span>
        <DayPhaseBadge phase={phase} />
      </div>
      <div className="mt-4 flex gap-3 border-t border-border pt-3 text-sm">
        <Link
          href={`/?city=${city.id}`}
          className="inline-flex items-center gap-1.5 text-fg-muted hover:text-accent"
        >
          <GlobeIcon size={15} /> Map
        </Link>
        <Link href={`/city/${city.slug}/`} className="text-fg-muted hover:text-accent">
          City page
        </Link>
      </div>
    </li>
  );
}

/** Bookmarked clocks as a drag-to-reorder grid (pointer, touch and keyboard). */
export function ClockGrid() {
  const bookmarks = useBookmarks((s) => s.cities);
  const moveCity = useBookmarks((s) => s.moveCity);
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const items = bookmarks.flatMap((b) => {
    const city = CITY_BY_ID.get(b.cityId);
    return city ? [{ bookmark: b, city }] : [];
  });

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) moveCity(String(active.id), String(over.id));
  };

  const name = (id: string | number) => {
    const b = items.find((i) => i.city.id === id);
    return b ? b.bookmark.label || b.city.name : String(id);
  };

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border p-10 text-center">
        <p className="font-medium">No clocks yet</p>
        <p className="mt-1 text-sm text-fg-muted">
          Star cities on the map, in search or in the list to pin them here.
        </p>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          <SearchIcon size={16} /> Find a city
        </button>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
          onDragOver: ({ active, over }) =>
            over
              ? `${name(active.id)} is over ${name(over.id)}.`
              : `${name(active.id)} is no longer over a clock.`,
          onDragEnd: ({ active, over }) =>
            over
              ? `${name(active.id)} was dropped at ${name(over.id)}'s position.`
              : `${name(active.id)} was dropped.`,
          onDragCancel: ({ active }) => `Reordering cancelled. ${name(active.id)} returned.`,
        },
      }}
    >
      <SortableContext items={items.map((i) => i.city.id)} strategy={rectSortingStrategy}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ bookmark, city }) => (
            <SortableClockCard key={city.id} bookmark={bookmark} city={city} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
