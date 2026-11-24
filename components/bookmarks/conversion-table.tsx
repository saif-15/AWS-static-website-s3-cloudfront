"use client";

import { flagEmoji, type City } from "@/data/cities";
import { MoonIcon, SunIcon, TwilightIcon } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";
import { dayPeriod, PERIOD_LABEL, type DayPeriod } from "@/lib/moments";
import { useSettings } from "@/lib/store/settings";
import { dayDelta, formatShortDate, formatTime, relativeDayLabel } from "@/lib/time";

const PERIOD_STYLE: Record<DayPeriod, string> = {
  work: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  early: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  evening: "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200",
  night: "border-indigo-400/40 bg-indigo-400/10 text-indigo-800 dark:text-indigo-200",
};

export interface ConversionRow {
  key: string;
  name: string;
  sub: string;
  timeZone: string;
  city?: City;
  highlight?: boolean;
}

/** Shows one instant across many zones, with day-offset and period badges (icon + text). */
export function ConversionTable({
  instant,
  sourceZone,
  rows,
}: {
  instant: number;
  sourceZone: string;
  rows: ConversionRow[];
}) {
  const hour12 = useSettings((s) => s.hour12);
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border">
      {rows.map((r) => {
        const period = dayPeriod(instant, r.timeZone);
        const delta = dayDelta(instant, r.timeZone, sourceZone);
        const Icon = period === "night" ? MoonIcon : period === "work" ? SunIcon : TwilightIcon;
        return (
          <li
            key={r.key}
            className={cx("flex items-center gap-3 px-4 py-3", r.highlight && "bg-accent/5")}
          >
            <span aria-hidden className="text-lg">
              {r.city ? flagEmoji(r.city.countryCode) : "📍"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{r.name}</span>
              <span className="block truncate text-xs text-fg-muted">{r.sub}</span>
            </span>
            <span
              className={cx(
                "hidden items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium sm:inline-flex",
                PERIOD_STYLE[period],
              )}
            >
              <Icon size={12} />
              {PERIOD_LABEL[period]}
            </span>
            <span className="text-right">
              <span className="time-nums block text-base font-semibold">
                {formatTime(instant, r.timeZone, { hour12, seconds: false })}
              </span>
              <span className="block text-[11px] text-fg-muted">
                {formatShortDate(instant, r.timeZone)}
                {delta !== 0 && (
                  <span className="ml-1 font-medium text-accent">({relativeDayLabel(delta)})</span>
                )}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
