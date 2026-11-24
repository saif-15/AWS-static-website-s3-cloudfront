"use client";

import type { ReactNode } from "react";
import type { City } from "@/data/cities";
import { useUserTimeZone } from "@/lib/hooks";
import { useSettings } from "@/lib/store/settings";
import { useMinute } from "@/lib/store/ticker";
import {
  dayDelta,
  findNextTransition,
  formatDifference,
  formatDuration,
  formatLongDate,
  formatOffset,
  formatSignedDuration,
  formatTime,
  getDayPhase,
  getOffsetMinutes,
  getSunTimes,
  getTimeDifferenceMinutes,
  getTimeZoneAbbreviation,
  isDST,
  observesDST,
  relativeDayLabel,
  formatShortDate,
  getZonedParts,
  type DayPhase,
} from "@/lib/time";
import {
  CalendarIcon,
  ClockIcon,
  GlobeIcon,
  MoonIcon,
  SunIcon,
  SunriseIcon,
  SunsetIcon,
  TwilightIcon,
} from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";

const PHASE_LABEL: Record<DayPhase, string> = {
  day: "Daytime",
  civil: "Civil twilight",
  nautical: "Nautical twilight",
  astronomical: "Astronomical twilight",
  night: "Night",
};

export function DayPhaseBadge({
  phase,
  className,
}: {
  phase: DayPhase | null;
  className?: string;
}) {
  if (!phase) {
    return <span className={cx("inline-block h-6 w-20 rounded-full bg-surface-2", className)} />;
  }
  const Icon = phase === "day" ? SunIcon : phase === "night" ? MoonIcon : TwilightIcon;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        phase === "day"
          ? "border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-200"
          : "border-indigo-400/40 bg-indigo-400/10 text-indigo-700 dark:text-indigo-200",
        className,
      )}
    >
      <Icon size={14} />
      {PHASE_LABEL[phase]}
    </span>
  );
}

/** Day/night for a city, updated once a minute. */
export function useDayPhase(city: City): DayPhase | null {
  const minute = useMinute();
  return minute === null ? null : getDayPhase(minute, city.lat, city.lon);
}

/** Date line with relative-day hint vs. the user ("Tomorrow"). */
export function CityDate({ city, long = false }: { city: City; long?: boolean }) {
  const minute = useMinute();
  const userTz = useUserTimeZone();
  if (minute === null) return <span className="inline-block h-4 w-40 rounded bg-surface-2" />;
  const delta = userTz ? dayDelta(minute, city.timeZone, userTz) : 0;
  const date = long
    ? formatLongDate(minute, city.timeZone)
    : formatShortDate(minute, city.timeZone);
  return (
    <span>
      {date}
      {delta !== 0 && (
        <span className="ml-2 rounded-md bg-accent/15 px-1.5 py-0.5 text-xs font-medium text-accent">
          {relativeDayLabel(delta)}
        </span>
      )}
    </span>
  );
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/50 p-3">
      <dt className="flex items-center gap-1.5 text-xs text-fg-muted">
        {icon}
        {label}
      </dt>
      <dd className="time-nums mt-1 text-sm font-medium text-fg">{value}</dd>
    </div>
  );
}

const Skel = () => <span className="inline-block h-4 w-16 rounded bg-surface-2" />;

/** Grid of facts: offset, difference, DST, sunrise/sunset, day length. */
export function CityFacts({ city, compact = false }: { city: City; compact?: boolean }) {
  const minute = useMinute();
  const userTz = useUserTimeZone();
  const hour12 = useSettings((s) => s.hour12);
  const tz = city.timeZone;

  if (minute === null) {
    return (
      <dl className={cx("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
        {Array.from({ length: compact ? 6 : 6 }, (_, i) => (
          <Fact key={i} icon={null} label=" " value={<Skel />} />
        ))}
      </dl>
    );
  }

  const offset = getOffsetMinutes(minute, tz);
  const abbr = getTimeZoneAbbreviation(minute, tz);
  const diff = userTz ? getTimeDifferenceMinutes(minute, tz, userTz) : 0;
  const year = getZonedParts(minute, tz).year;
  const dstObserved = observesDST(year, tz) || observesDST(year + 1, tz);
  const dstNow = isDST(minute, tz);
  const next = dstObserved ? findNextTransition(minute, tz) : null;
  const sun = getSunTimes(minute, tz, city.lat, city.lon);
  const t = (ms: number) => formatTime(ms, tz, { hour12, seconds: false });

  const dstText = !dstObserved
    ? "Not observed"
    : dstNow
      ? "In effect (summer time)"
      : "Standard time";

  return (
    <div className="space-y-3">
      <dl className={cx("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
        <Fact
          icon={<GlobeIcon size={14} />}
          label="UTC offset"
          value={
            <>
              {formatOffset(offset)}
              <span className="ml-1.5 text-fg-muted">{abbr.startsWith("GMT") ? "" : abbr}</span>
            </>
          }
        />
        <Fact
          icon={<ClockIcon size={14} />}
          label="From your time"
          value={
            <span title={userTz ? `Your zone: ${userTz}` : undefined}>
              {diff === 0 ? "Same time" : formatSignedDuration(diff)}
            </span>
          }
        />
        <Fact icon={<CalendarIcon size={14} />} label="Daylight saving" value={dstText} />
        <Fact
          icon={<SunriseIcon size={14} />}
          label="Sunrise"
          value={
            sun.sunrise !== null
              ? t(sun.sunrise)
              : sun.state === "polar-day"
                ? "Sun up all day"
                : "No sunrise"
          }
        />
        <Fact
          icon={<SunsetIcon size={14} />}
          label="Sunset"
          value={
            sun.sunset !== null
              ? t(sun.sunset)
              : sun.state === "polar-day"
                ? "No sunset"
                : "Sun down all day"
          }
        />
        <Fact
          icon={<SunIcon size={14} />}
          label="Day length"
          value={formatDuration(sun.dayLength)}
        />
      </dl>
      {!compact && userTz && (
        <p className="text-sm text-fg-muted">
          {city.name} is{" "}
          <span className="font-medium text-fg">
            {formatDifference(diff).replace(" as you", "")}
          </span>
          {diff !== 0 && " of your local time"} ({userTz.replace(/_/g, " ")}).
        </p>
      )}
      {next && (
        <p className="text-sm text-fg-muted">
          Clocks go {next.toOffset > next.fromOffset ? "forward" : "back"}{" "}
          {formatDuration(Math.abs(next.toOffset - next.fromOffset))
            .replace(/^0h /, "")
            .replace(/ 00m$/, "")}{" "}
          on <span className="text-fg">{formatShortDate(next.at, tz)}</span> at{" "}
          <span className="time-nums text-fg">
            {formatTime(next.at + next.fromOffset * 60_000, "UTC", { hour12, seconds: false })}
          </span>{" "}
          local time.
        </p>
      )}
    </div>
  );
}
