"use client";

import Link from "next/link";
import type { City } from "@/data/cities";
import { BookmarkStar } from "@/components/clock/bookmark-star";
import { LiveTime } from "@/components/clock/live-time";
import { GlobeIcon } from "@/components/ui/icons";
import { CityDate, CityFacts, DayPhaseBadge, useDayPhase } from "./city-facts";

/** Live part of a city page: big clock, date, day/night, facts. */
export function CityHero({ city }: { city: City }) {
  const phase = useDayPhase(city);
  return (
    <div className="space-y-6">
      <div>
        <LiveTime
          timeZone={city.timeZone}
          seconds
          label={`Current time in ${city.name}`}
          focusable
          className="text-6xl font-semibold tracking-tight sm:text-7xl md:text-8xl"
        />
        <p className="mt-3 text-lg text-fg-muted">
          <CityDate city={city} long />
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <DayPhaseBadge phase={phase} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <BookmarkStar cityId={city.id} cityName={city.name} showText />
        <Link
          href={`/?city=${city.id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-surface-2"
        >
          <GlobeIcon size={16} /> Show on map
        </Link>
        <Link
          href={`/bookmarks/?city=${city.id}`}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-accent hover:bg-accent/10"
        >
          Plan a moment here
        </Link>
      </div>
      <CityFacts city={city} />
    </div>
  );
}
