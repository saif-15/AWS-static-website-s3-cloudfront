"use client";

import { LiveTime } from "@/components/clock/live-time";
import { useUserTimeZone } from "@/lib/hooks";
import { useMinute } from "@/lib/store/ticker";
import { formatOffset, formatShortDate, getOffsetMinutes } from "@/lib/time";

function zoneCity(tz: string): string {
  return (tz.split("/").pop() ?? tz).replace(/_/g, " ");
}

/** The user's own detected zone — shown prominently at the top. */
export function YourTime({ compact = false }: { compact?: boolean }) {
  const tz = useUserTimeZone();
  const minute = useMinute();

  return (
    <section
      aria-label="Your local time"
      className="glass pointer-events-auto flex items-center gap-3 rounded-2xl px-3.5 py-2"
    >
      <span className="relative flex size-2.5 shrink-0" aria-hidden>
        <span className="live-dot absolute inline-flex size-full rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-[11px] font-medium uppercase tracking-wider text-fg-muted">
          Your time{tz ? ` · ${zoneCity(tz)}` : ""}
        </p>
        <LiveTime
          timeZone={tz ?? "UTC"}
          label="Your local time"
          focusable
          className={compact ? "text-xl font-semibold" : "text-2xl font-semibold tracking-tight"}
        />
      </div>
      {!compact && (
        <div className="hidden border-l border-border pl-3 text-xs leading-5 text-fg-muted sm:block">
          <p className="time-nums">
            {tz && minute !== null ? formatOffset(getOffsetMinutes(minute, tz)) : "UTC…"}
          </p>
          <p>{tz && minute !== null ? formatShortDate(minute, tz) : " "}</p>
        </div>
      )}
    </section>
  );
}

/** UTC reference clock. */
export function UtcClock() {
  return (
    <section
      aria-label="Coordinated Universal Time"
      className="glass pointer-events-auto hidden rounded-2xl px-3.5 py-2 xl:block"
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-fg-muted">UTC</p>
      <LiveTime timeZone="UTC" label="UTC" className="text-lg font-medium text-fg-muted" />
    </section>
  );
}
