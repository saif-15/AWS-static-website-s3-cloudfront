"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { flagEmoji, type City } from "@/data/cities";
import { LiveTime } from "@/components/clock/live-time";
import { CityDate, DayPhaseBadge, useDayPhase } from "@/components/city/city-facts";
import { useUserTimeZone } from "@/lib/hooks";
import { useMinute } from "@/lib/store/ticker";
import {
  formatDifference,
  formatOffset,
  getOffsetMinutes,
  getTimeDifferenceMinutes,
} from "@/lib/time";

export interface TooltipAnchor {
  city: City;
  x: number;
  y: number;
}

function TooltipBody({ city }: { city: City }) {
  const minute = useMinute();
  const userTz = useUserTimeZone();
  const phase = useDayPhase(city);
  const offset = minute === null ? null : getOffsetMinutes(minute, city.timeZone);
  const diff =
    minute === null || !userTz ? null : getTimeDifferenceMinutes(minute, city.timeZone, userTz);
  return (
    <>
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-lg leading-none">
          {flagEmoji(city.countryCode)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{city.name}</p>
          <p className="truncate text-xs text-fg-muted">{city.country}</p>
        </div>
      </div>
      <LiveTime
        timeZone={city.timeZone}
        seconds
        className="mt-2 text-2xl font-semibold tracking-tight"
      />
      <p className="text-xs text-fg-muted">
        <CityDate city={city} />
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        <span className="time-nums text-fg">{offset === null ? "UTC…" : formatOffset(offset)}</span>
        <span className="text-fg-muted">{diff === null ? "" : formatDifference(diff)}</span>
      </div>
      <DayPhaseBadge phase={phase} className="mt-2" />
    </>
  );
}

/** Hover/focus tooltip anchored to a marker's screen position. Non-interactive. */
export function CityTooltip({ anchor, width }: { anchor: TooltipAnchor | null; width: number }) {
  return (
    <AnimatePresence>
      {anchor && (
        <m.div
          key={anchor.city.id}
          role="tooltip"
          id="map-tooltip"
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="glass-strong pointer-events-none absolute z-20 w-60 rounded-2xl p-3 shadow-2xl"
          style={{
            left: Math.min(Math.max(anchor.x - 120, 8), Math.max(8, width - 248)),
            top: anchor.y < 220 ? anchor.y + 18 : anchor.y - 18,
            translate: anchor.y < 220 ? "0 0" : "0 -100%",
          }}
        >
          <TooltipBody city={anchor.city} />
        </m.div>
      )}
    </AnimatePresence>
  );
}
