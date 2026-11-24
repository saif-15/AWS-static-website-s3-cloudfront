"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { CITY_BY_ID, flagEmoji, type City } from "@/data/cities";
import { BookmarkStar } from "@/components/clock/bookmark-star";
import { LiveTime } from "@/components/clock/live-time";
import { CityDate, CityFacts, DayPhaseBadge, useDayPhase } from "@/components/city/city-facts";
import { ArrowRightIcon, CalendarIcon, CloseIcon } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/primitives";
import { useIsDesktop } from "@/lib/hooks";
import { useUI } from "@/lib/store/ui";

function focusMarker(id: string) {
  document
    .querySelector<SVGGElement>(`g[data-city="${CSS.escape(id)}"]`)
    ?.focus({ preventScroll: true });
}

function PanelContent({ city, onClose }: { city: City; onClose: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const phase = useDayPhase(city);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [city.id]);

  return (
    <m.div
      key={city.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-5"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 text-3xl leading-none">
          {flagEmoji(city.countryCode)}
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="panel-title"
            ref={headingRef}
            tabIndex={-1}
            className="truncate text-xl font-semibold tracking-tight outline-none"
          >
            {city.name}
          </h2>
          <p className="truncate text-sm text-fg-muted">
            {city.country} · <span className="time-nums">{city.timeZone.replace(/_/g, " ")}</span>
          </p>
        </div>
        <BookmarkStar cityId={city.id} cityName={city.name} />
        <IconButton label="Close panel" variant="ghost" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </div>

      <div>
        <LiveTime
          timeZone={city.timeZone}
          seconds
          label={`Time in ${city.name}`}
          focusable
          className="text-5xl font-semibold tracking-tight md:text-6xl"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
          <CityDate city={city} long />
        </div>
        <DayPhaseBadge phase={phase} className="mt-3" />
      </div>

      <CityFacts city={city} compact />

      <div className="flex flex-wrap gap-2">
        <BookmarkStar cityId={city.id} cityName={city.name} showText />
        <Link
          href={`/bookmarks/?city=${city.id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-surface-2"
        >
          <CalendarIcon size={16} />
          Plan a moment
        </Link>
        <Link
          href={`/city/${city.slug}/`}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-accent hover:bg-accent/10"
        >
          City page
          <ArrowRightIcon size={16} />
        </Link>
      </div>
    </m.div>
  );
}

/** Detail panel: right-side card on desktop, bottom sheet on mobile. Spring-driven. */
export function CityPanel() {
  const selectedId = useUI((s) => s.selectedCityId);
  const selectCity = useUI((s) => s.selectCity);
  const city = selectedId ? CITY_BY_ID.get(selectedId) : undefined;
  const desktop = useIsDesktop();

  const close = () => {
    const id = useUI.getState().selectedCityId;
    selectCity(null);
    if (id) requestAnimationFrame(() => focusMarker(id));
  };

  useEffect(() => {
    if (!city) return;
    const onKey = (e: KeyboardEvent) => {
      const ui = useUI.getState();
      if (e.key === "Escape" && !ui.searchOpen && !ui.listOpen && !ui.settingsOpen) {
        const id = ui.selectedCityId;
        ui.selectCity(null);
        if (id) requestAnimationFrame(() => focusMarker(id));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [city]);

  const hidden = desktop ? { x: "calc(100% + 32px)", y: 0 } : { x: 0, y: "100%" };

  return (
    <AnimatePresence>
      {city && (
        <m.aside
          key="city-panel"
          aria-labelledby="panel-title"
          initial={hidden}
          animate={{ x: 0, y: 0 }}
          exit={hidden}
          transition={{ type: "spring", stiffness: 340, damping: 34, mass: 0.9 }}
          className="glass-strong fixed inset-x-0 bottom-0 z-40 max-h-[78dvh] overflow-y-auto rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl md:inset-x-auto md:bottom-4 md:right-4 md:top-20 md:max-h-none md:w-[400px] md:rounded-3xl"
        >
          <div
            aria-hidden
            className="mx-auto -mt-2 mb-3 h-1.5 w-10 rounded-full bg-border md:hidden"
          />
          <AnimatePresence mode="wait" initial={false}>
            <PanelContent key={city.id} city={city} onClose={close} />
          </AnimatePresence>
        </m.aside>
      )}
    </AnimatePresence>
  );
}
