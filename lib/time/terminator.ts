import { geoCircle } from "d3-geo";
import type { Polygon } from "geojson";
import { antipode, getSubsolarPoint, SUNRISE_ELEVATION } from "./sun";
import type { Instant } from "./zoned";

/**
 * Night-side bands as spherical caps centred on the anti-solar point.
 * A point is in a band when the sun's elevation there is below `elevation`,
 * i.e. its angular distance to the anti-solar point is < 90 + elevation.
 * Layering the caps with low opacity gives a soft twilight gradient.
 */
export const TWILIGHT_BANDS = [
  { name: "horizon", elevation: SUNRISE_ELEVATION, opacity: 0.13 },
  { name: "civil-mid", elevation: -3, opacity: 0.12 },
  { name: "civil", elevation: -6, opacity: 0.12 },
  { name: "nautical-mid", elevation: -9, opacity: 0.11 },
  { name: "nautical", elevation: -12, opacity: 0.11 },
  { name: "astronomical-mid", elevation: -15, opacity: 0.1 },
  { name: "astronomical", elevation: -18, opacity: 0.1 },
] as const;

export interface TerminatorBand {
  name: (typeof TWILIGHT_BANDS)[number]["name"];
  opacity: number;
  /** Angular radius of the cap in degrees. */
  radius: number;
  polygon: Polygon;
}

export interface Terminator {
  subsolar: [number, number];
  antisolar: [number, number];
  bands: TerminatorBand[];
}

export function getTerminator(instant: Instant, precision = 2): Terminator {
  const subsolar = getSubsolarPoint(instant);
  const antisolar = antipode(subsolar);
  const bands = TWILIGHT_BANDS.map((b) => {
    const radius = 90 + b.elevation;
    const polygon = geoCircle().center(antisolar).radius(radius).precision(precision)();
    return { name: b.name, opacity: b.opacity, radius, polygon };
  });
  return { subsolar, antisolar, bands };
}
