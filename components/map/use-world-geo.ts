"use client";

import { useEffect, useState } from "react";
import type { Feature, FeatureCollection, MultiLineString } from "geojson";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

export interface WorldGeo {
  land: Feature | FeatureCollection;
  borders: MultiLineString;
}

type WorldTopology = Topology<{ countries: GeometryCollection; land: GeometryCollection }>;

export const WORLD_URL = "/data/countries-110m.json";

function isWorldTopology(x: unknown): x is WorldTopology {
  if (!x || typeof x !== "object") return false;
  const t = x as { type?: unknown; arcs?: unknown; objects?: Record<string, unknown> };
  return (
    t.type === "Topology" &&
    Array.isArray(t.arcs) &&
    !!t.objects &&
    typeof t.objects.countries === "object" &&
    typeof t.objects.land === "object"
  );
}

let cache: Promise<WorldGeo> | null = null;

/** Loads the locally hosted world-atlas 110m TopoJSON once (same origin, no CDN). */
export function loadWorldGeo(): Promise<WorldGeo> {
  cache ??= fetch(WORLD_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`Map data request failed (${r.status})`);
      return r.json() as Promise<unknown>;
    })
    .then((topo) => {
      if (!isWorldTopology(topo)) throw new Error("Map data is malformed");
      return {
        land: feature(topo, topo.objects.land),
        borders: mesh(topo, topo.objects.countries, (a, b) => a !== b),
      };
    })
    .catch((e: unknown) => {
      cache = null;
      throw e;
    });
  return cache;
}

export function useWorldGeo(): { geo: WorldGeo | null; error: string | null } {
  const [state, setState] = useState<{ geo: WorldGeo | null; error: string | null }>({
    geo: null,
    error: null,
  });
  useEffect(() => {
    let alive = true;
    loadWorldGeo().then(
      (geo) => alive && setState({ geo, error: null }),
      (e: unknown) =>
        alive &&
        setState({ geo: null, error: e instanceof Error ? e.message : "Failed to load map" }),
    );
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
