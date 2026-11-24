import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import type { Feature, FeatureCollection } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import land110 from "world-atlas/land-110m.json";
import type { City } from "@/data/cities";
import { GlobeNight } from "./globe-night";

const SIZE = 320;

// Server component: the land shape is rendered to static SVG at build time,
// so the city pages ship no map data or map code for the base globe.
const topo = land110 as unknown as Topology<{ land: GeometryCollection }>;
const LAND: Feature | FeatureCollection = feature(topo, topo.objects.land);

export function MiniGlobe({ city }: { city: City }) {
  const rotate: [number, number] = [-city.lon, -Math.max(-50, Math.min(50, city.lat)) * 0.8];
  const projection = geoOrthographic()
    .rotate(rotate)
    .scale(SIZE / 2 - 8)
    .translate([SIZE / 2, SIZE / 2])
    .clipAngle(90);
  const path = geoPath(projection).digits(0);
  const p = projection([city.lon, city.lat]);

  return (
    <figure className="relative">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto w-full max-w-[320px] drop-shadow-[0_20px_60px_rgba(79,216,196,0.12)]"
        role="img"
        aria-label={`Globe centred on ${city.name}, ${city.country}`}
      >
        <defs>
          <radialGradient id="globe-ocean" cx="40%" cy="35%" r="75%">
            <stop offset="0%" stopColor="var(--ocean-hi)" />
            <stop offset="100%" stopColor="var(--ocean)" />
          </radialGradient>
        </defs>
        <path d={path({ type: "Sphere" }) ?? ""} fill="url(#globe-ocean)" stroke="var(--border)" />
        <path
          d={path(geoGraticule10()) ?? ""}
          fill="none"
          stroke="var(--graticule)"
          strokeWidth={0.6}
        />
        <path
          d={path(LAND) ?? ""}
          fill="var(--land)"
          stroke="var(--land-stroke)"
          strokeWidth={0.4}
        />
        <GlobeNight rotate={rotate} size={SIZE} />
        {p && (
          <g transform={`translate(${p[0]},${p[1]})`}>
            <circle r={14} fill="var(--accent)" opacity={0.18} />
            <circle r={5} fill="var(--accent)" stroke="var(--bg)" strokeWidth={1.5} />
          </g>
        )}
      </svg>
      <figcaption className="sr-only">
        {city.name} is at {Math.abs(city.lat).toFixed(2)}°{city.lat >= 0 ? "N" : "S"},{" "}
        {Math.abs(city.lon).toFixed(2)}°{city.lon >= 0 ? "E" : "W"}.
      </figcaption>
    </figure>
  );
}
