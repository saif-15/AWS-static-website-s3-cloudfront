"use client";

import { memo, useMemo } from "react";
import { geoPath, type GeoProjection } from "d3-geo";
import { getTerminator } from "@/lib/time/terminator";
import { useMinute } from "@/lib/store/ticker";
import { useSettings } from "@/lib/store/settings";

/**
 * Day/night overlay. Recomputed once per minute (driven by the global ticker),
 * drawn as stacked twilight caps for a soft gradient edge.
 */
export const TerminatorLayer = memo(function TerminatorLayer({
  projection,
}: {
  projection: GeoProjection;
}) {
  const minute = useMinute();
  const show = useSettings((s) => s.showTerminator);

  const shapes = useMemo(() => {
    if (minute === null) return null;
    const term = getTerminator(minute);
    const path = geoPath(projection).digits(1);
    return {
      bands: term.bands.map((b) => ({
        name: b.name,
        opacity: b.opacity,
        d: path(b.polygon) ?? "",
      })),
      sun: projection(term.subsolar),
    };
  }, [minute, projection]);

  if (!shapes) return null;

  return (
    <g
      className="terminator-layer transition-opacity duration-700"
      style={{ opacity: show ? 1 : 0 }}
      aria-hidden="true"
      pointerEvents="none"
    >
      {shapes.bands.map((b) => (
        <path key={b.name} d={b.d} fill="var(--night)" fillOpacity={b.opacity * 2.2} />
      ))}
      {shapes.sun && (
        <g transform={`translate(${shapes.sun[0]},${shapes.sun[1]})`}>
          <circle r={18} fill="url(#sun-glow)" />
          <circle
            r={4}
            fill="#fcd34d"
            stroke="#fff7d6"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      )}
    </g>
  );
});
