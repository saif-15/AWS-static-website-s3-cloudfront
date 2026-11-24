"use client";

import {
  memo,
  useLayoutEffect,
  useMemo,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { City } from "@/data/cities";
import { formatTime } from "@/lib/time/format";
import { isDaytime } from "@/lib/time/sun";
import { useBookmarks } from "@/lib/store/bookmarks";
import { useSettings } from "@/lib/store/settings";
import { useMinute, useTicked } from "@/lib/store/ticker";
import { useUI } from "@/lib/store/ui";

export interface MarkerPoint {
  city: City;
  x: number;
  y: number;
  labelWidth: number;
}

interface MarkersLayerProps {
  points: MarkerPoint[];
  /** Called after every render so the map can position nodes & resolve labels. */
  onLayout: () => void;
  onHover: (city: City | null, el: SVGGElement | null) => void;
}

const STAR =
  "M0,-7 L2.06,-2.83 L6.66,-2.16 L3.33,1.08 L4.11,5.66 L0,3.5 L-4.11,5.66 L-3.33,1.08 L-6.66,-2.16 L-2.06,-2.83 Z";

/** Live "HH:mm" for a marker label — re-renders only when the minute string changes. */
function LabelTime({ timeZone }: { timeZone: string }) {
  const hour12 = useSettings((s) => s.hour12);
  const text = useTicked((now) => formatTime(now, timeZone, { hour12, seconds: false }));
  return <>{text ?? "--:--"}</>;
}

/**
 * City markers live OUTSIDE the zoomed group: the map writes screen-space
 * `transform`s directly to these nodes on each zoom frame (no React re-render),
 * so markers stay crisp and constant-size. React only re-renders this layer when
 * bookmarks/selection change or once per minute for day/night state.
 */
export const MarkersLayer = memo(function MarkersLayer({
  points,
  onLayout,
  onHover,
}: MarkersLayerProps) {
  const bookmarks = useBookmarks((s) => s.cities);
  const selectedId = useUI((s) => s.selectedCityId);
  const selectCity = useUI((s) => s.selectCity);
  const minute = useMinute();

  const bookmarked = useMemo(() => new Set(bookmarks.map((b) => b.cityId)), [bookmarks]);

  useLayoutEffect(() => {
    onLayout();
  });

  const rows = points.map((pt, i) => ({
    pt,
    i,
    isBm: bookmarked.has(pt.city.id),
    isSel: selectedId === pt.city.id,
    day: minute === null ? null : isDaytime(minute, pt.city.lat, pt.city.lon),
  }));

  return (
    <>
      {/* Dots (interactive). Important cities come first in DOM = tab order. */}
      <g className="dots">
        {rows.map(({ pt, i, isBm, isSel, day }) => {
          const { city } = pt;
          const open = () => selectCity(city.id, { fly: true });
          return (
            <g
              key={city.id}
              className="marker"
              data-city={city.id}
              data-x={pt.x}
              data-y={pt.y}
              data-w={pt.labelWidth}
              data-priority={city.priority}
              data-bm={isBm ? "1" : "0"}
              data-sel={isSel ? "1" : "0"}
              data-day={day === null ? undefined : day ? "1" : "0"}
              role="button"
              tabIndex={0}
              aria-label={`${city.name}, ${city.country}${isBm ? " (in My Clocks)" : ""}${
                day === null ? "" : day ? ", daytime" : ", night"
              }. Open details.`}
              aria-pressed={isSel}
              onClick={open}
              onKeyDown={(e: KeyboardEvent<SVGGElement>) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  open();
                }
              }}
              onPointerEnter={(e: PointerEvent<SVGGElement>) => {
                if (e.pointerType === "mouse") onHover(city, e.currentTarget);
              }}
              onPointerLeave={() => onHover(null, null)}
              onFocus={(e: FocusEvent<SVGGElement>) => onHover(city, e.currentTarget)}
              onBlur={() => onHover(null, null)}
            >
              <g className="marker-inner" style={{ ["--i" as string]: Math.min(i, 120) }}>
                <circle className="marker-hit" r={13} />
                <circle className="marker-focus" r={11} />
                {isSel && <circle className="marker-selected" r={9} />}
                {isBm ? (
                  <>
                    <circle className="marker-pulse" r={7} />
                    <path className="marker-star" d={STAR} />
                  </>
                ) : (
                  <circle className="marker-dot" r={city.priority === 1 ? 3.4 : 2.8} />
                )}
              </g>
            </g>
          );
        })}
      </g>
      {/* Labels in their own layer above every dot, so no dot can cover a label.
          Decorative for AT: each marker's aria-label already carries the info. */}
      <g className="labels" aria-hidden="true">
        {rows.map(({ pt, i, isBm, isSel, day }) => (
          <g
            key={pt.city.id}
            className="city-label"
            data-label-for={pt.city.id}
            data-x={pt.x}
            data-y={pt.y}
            data-bm={isBm ? "1" : "0"}
            data-sel={isSel ? "1" : "0"}
          >
            <text
              className="marker-label"
              x={8}
              y={-2}
              style={{ ["--i" as string]: Math.min(i, 120) }}
            >
              <tspan className="marker-name">{pt.city.name}</tspan>
              <tspan className="marker-time" x={8} dy={12}>
                <LabelTime timeZone={pt.city.timeZone} />
                {day !== null && (day ? " ☀" : " ☾")}
              </tspan>
            </text>
          </g>
        ))}
      </g>
    </>
  );
});
