"use client";

import { useMemo } from "react";
import { geoOrthographic, geoPath } from "d3-geo";
import { getTerminator } from "@/lib/time/terminator";
import { useSettings } from "@/lib/store/settings";
import { useMinute } from "@/lib/store/ticker";

/** Live night-side overlay for the server-rendered mini globe (updates per minute). */
export function GlobeNight({ rotate, size }: { rotate: [number, number]; size: number }) {
  const minute = useMinute();
  const show = useSettings((s) => s.showTerminator);
  const bands = useMemo(() => {
    if (minute === null) return null;
    const projection = geoOrthographic()
      .rotate(rotate)
      .scale(size / 2 - 8)
      .translate([size / 2, size / 2])
      .clipAngle(90);
    const path = geoPath(projection).digits(1);
    return getTerminator(minute).bands.map((b) => ({
      key: b.name,
      d: path(b.polygon) ?? "",
      o: b.opacity,
    }));
  }, [minute, rotate, size]);

  if (!bands || !show) return null;
  return (
    <g aria-hidden pointerEvents="none">
      {bands.map((b) => (
        <path key={b.key} d={b.d} fill="var(--night)" fillOpacity={b.o * 2.2} />
      ))}
    </g>
  );
}
