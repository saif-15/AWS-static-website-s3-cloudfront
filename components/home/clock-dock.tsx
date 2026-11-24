"use client";

import Link from "next/link";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { CITY_BY_ID, flagEmoji, type City } from "@/data/cities";
import { LiveTime } from "@/components/clock/live-time";
import { useDayPhase } from "@/components/city/city-facts";
import { MoonIcon, StarIcon, SunIcon, TwilightIcon } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";
import { useUserTimeZone } from "@/lib/hooks";
import { useBookmarks } from "@/lib/store/bookmarks";
import { useMinute } from "@/lib/store/ticker";
import { useUI } from "@/lib/store/ui";
import { formatSignedDuration, getTimeDifferenceMinutes } from "@/lib/time";

function DockCard({ city, label }: { city: City; label?: string }) {
  const selectCity = useUI((s) => s.selectCity);
  const selected = useUI((s) => s.selectedCityId === city.id);
  const minute = useMinute();
  const userTz = useUserTimeZone();
  const phase = useDayPhase(city);
  const diff =
    minute !== null && userTz ? getTimeDifferenceMinutes(minute, city.timeZone, userTz) : null;
  const PhaseIcon = phase === "day" ? SunIcon : phase === "night" ? MoonIcon : TwilightIcon;

  return (
    <m.li
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      className="shrink-0 snap-start"
    >
      <button
        type="button"
        onClick={() => selectCity(city.id, { fly: true })}
        aria-pressed={selected}
        className={cx(
          "group flex w-44 flex-col rounded-2xl border px-3.5 py-2.5 text-left transition-colors",
          selected
            ? "border-accent bg-accent/10"
            : "border-transparent hover:border-border hover:bg-surface-2/60",
        )}
      >
        <span className="flex items-center gap-1.5 text-xs text-fg-muted">
          <span aria-hidden>{flagEmoji(city.countryCode)}</span>
          <span className="truncate font-medium text-fg">{label || city.name}</span>
          {phase && (
            <span
              className="ml-auto inline-flex"
              title={phase === "day" ? "Daytime" : "Night / twilight"}
            >
              <PhaseIcon size={13} aria-hidden />
              <span className="sr-only">{phase === "day" ? "Daytime" : "Night or twilight"}</span>
            </span>
          )}
        </span>
        <LiveTime
          timeZone={city.timeZone}
          label={`Time in ${label || city.name}`}
          animated
          className="mt-0.5 text-[22px] font-semibold tracking-tight"
        />
        <span className="time-nums text-[11px] text-fg-muted">
          {diff === null
            ? " "
            : diff === 0
              ? "Same as you"
              : `${formatSignedDuration(diff)} from you`}
        </span>
      </button>
    </m.li>
  );
}

/** "My Clocks" dock: bookmarked cities as live cards along the bottom of the map. */
export function ClockDock() {
  const bookmarks = useBookmarks((s) => s.cities);
  const panelOpen = useUI((s) => s.selectedCityId !== null);
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  const items = bookmarks.flatMap((b) => {
    const city = CITY_BY_ID.get(b.cityId);
    return city ? [{ city, label: b.label }] : [];
  });

  return (
    <div
      className={cx(
        "pointer-events-none fixed inset-x-3 bottom-3 z-20 flex justify-center transition-[right] duration-500 md:bottom-4 md:left-4",
        panelOpen ? "md:right-[440px]" : "md:right-4",
      )}
    >
      <section
        aria-label="My Clocks"
        className="glass pointer-events-auto flex max-w-full items-center gap-1 overflow-hidden rounded-3xl p-1.5"
      >
        <Link
          href="/bookmarks/"
          className="hidden shrink-0 flex-col items-center justify-center gap-0.5 self-stretch rounded-2xl px-3 text-[10px] font-semibold uppercase tracking-wider text-fg-muted hover:bg-surface-2 hover:text-fg sm:flex"
        >
          <StarIcon size={16} filled className="text-accent" />
          My Clocks
        </Link>
        {items.length === 0 ? (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-fg-muted hover:text-fg"
          >
            <StarIcon size={16} />
            Star a city to pin its live clock here
          </button>
        ) : (
          <ul className="flex snap-x gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none]">
            <AnimatePresence initial={false}>
              {items.map(({ city, label }) => (
                <DockCard key={city.id} city={city} label={label} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>
    </div>
  );
}
