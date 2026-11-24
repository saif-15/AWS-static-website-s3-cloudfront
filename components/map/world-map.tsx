"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { geoEqualEarth, geoGraticule10, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import { CITIES, CITY_BY_ID, type City } from "@/data/cities";
import { estimateLabelWidth, maxPriorityForZoom, resolveLabelCollisions } from "@/lib/map/labels";
import { easeInOutCubic, flyDuration, interpolateView, type View } from "@/lib/map/fly";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { getUserTimeZone } from "@/lib/time/zoned";
import { useSettings } from "@/lib/store/settings";
import { useUI } from "@/lib/store/ui";
import { MinusIcon, PlusIcon, ResetIcon, TwilightIcon } from "@/components/ui/icons";
import { IconButton, cx } from "@/components/ui/primitives";
import { CityTooltip, type TooltipAnchor } from "./city-tooltip";
import { MarkersLayer, type MarkerPoint } from "./markers-layer";
import { TerminatorLayer } from "./terminator-layer";
import { useWorldGeo } from "./use-world-geo";

type Extent = [[number, number], [number, number]];

const MIN_K = 1;
const MAX_K = 10;
const PANEL_WIDTH = 420;

/** Cities in tab order: most important first, then west → east. */
const ORDERED: City[] = [...CITIES].sort((a, b) => a.priority - b.priority || a.lon - b.lon);

export function WorldMap() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewRef = useRef<SVGGElement>(null);
  const markersRef = useRef<SVGGElement>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const animRef = useRef<number | null>(null);
  const labelRaf = useRef<number | null>(null);
  const initialised = useRef(false);

  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [tooltip, setTooltip] = useState<TooltipAnchor | null>(null);
  const { geo, error } = useWorldGeo();
  const reducedMotion = usePrefersReducedMotion();
  const showTerminator = useSettings((s) => s.showTerminator);
  const setSetting = useSettings((s) => s.set);
  const flyRequest = useUI((s) => s.flyRequest);
  const selectedId = useUI((s) => s.selectedCityId);

  // --- size ------------------------------------------------------------------
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      setSize((s) => (s && s.w === w && s.h === h ? s : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // --- projection & static geometry -----------------------------------------
  /**
   * Landscape: fit the whole world in the viewport.
   * Portrait (phones): fit to height so the map fills the screen and pans
   * sideways; `worldExtent` then extends beyond the viewport horizontally.
   */
  const view = useMemo(() => {
    if (!size) return null;
    const sphere = { type: "Sphere" } as const;
    const portrait = size.h > size.w * 0.9;
    let projection;
    if (!portrait) {
      const pad = Math.max(12, Math.min(size.w, size.h) * 0.03);
      projection = geoEqualEarth().fitExtent(
        [
          [pad, pad + 40],
          [size.w - pad, size.h - pad],
        ],
        sphere,
      );
    } else {
      const mapH = Math.min(size.h - 220, size.w * 1.15);
      projection = geoEqualEarth().fitHeight(mapH, sphere);
      const [[x0, y0], [x1, y1]] = geoPath(projection).bounds(sphere);
      const [tx, ty] = projection.translate();
      projection.translate([
        tx + (size.w - (x1 - x0)) / 2 - x0,
        ty + (size.h - (y1 - y0)) / 2 - y0 + 24,
      ]);
    }
    const [[bx0, by0], [bx1, by1]] = geoPath(projection).bounds(sphere);
    const worldExtent: Extent = [
      [Math.min(0, bx0 - 16), Math.min(0, by0)],
      [Math.max(size.w, bx1 + 16), Math.max(size.h, by1)],
    ];
    return { projection, worldExtent, portrait };
  }, [size]);
  const projection = view?.projection ?? null;

  const paths = useMemo(() => {
    if (!projection) return null;
    const path = geoPath(projection).digits(1);
    return {
      sphere: path({ type: "Sphere" }) ?? "",
      graticule: path(geoGraticule10()) ?? "",
      land: geo ? (path(geo.land) ?? "") : "",
      borders: geo ? (path(geo.borders) ?? "") : "",
    };
  }, [projection, geo]);

  const points = useMemo<MarkerPoint[]>(() => {
    if (!projection) return [];
    return ORDERED.flatMap((city) => {
      const p = projection([city.lon, city.lat]);
      return p ? [{ city, x: p[0], y: p[1], labelWidth: estimateLabelWidth(city.name) }] : [];
    });
  }, [projection]);

  // --- imperative layer updates (no React re-render while zooming) ----------
  const updateLabels = useCallback(() => {
    labelRaf.current = null;
    const root = markersRef.current;
    if (!root || !size) return;
    const t = transformRef.current;
    const maxP = maxPriorityForZoom(t.k);
    const nodes = root.querySelectorAll<SVGGElement>("g[data-city]");
    const boxes = [];
    let i = 0;
    for (const n of nodes) {
      const d = n.dataset;
      const p = Number(d.priority);
      const bm = d.bm === "1";
      const sel = d.sel === "1";
      i++;
      if (p > maxP && !bm && !sel) continue;
      boxes.push({
        id: d.city ?? "",
        x: t.applyX(Number(d.x)),
        y: t.applyY(Number(d.y)),
        width: Number(d.w),
        height: 26,
        rank: (sel ? 0 : bm ? 1 : 1 + p) * 10_000 + i,
      });
    }
    const visible = resolveLabelCollisions(boxes, { width: size.w, height: size.h });
    for (const l of root.querySelectorAll<SVGGElement>("g[data-label-for]")) {
      l.dataset.label = visible.has(l.dataset.labelFor ?? "") ? "on" : "off";
    }
    for (const n of nodes) {
      const d = n.dataset;
      // Dots appear one zoom level before their labels; hidden markers are also
      // removed from the tab order (visibility: hidden), keeping it short at low zoom.
      d.show = Number(d.priority) <= maxP + 1 || d.bm === "1" || d.sel === "1" ? "1" : "0";
    }
  }, [size]);

  const positionMarkers = useCallback(() => {
    const root = markersRef.current;
    if (!root) return;
    const t = transformRef.current;
    for (const n of root.querySelectorAll<SVGGElement>("g[data-city], g[data-label-for]")) {
      const x = t.applyX(Number(n.dataset.x));
      const y = t.applyY(Number(n.dataset.y));
      n.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)})`);
    }
  }, []);

  const scheduleLabels = useCallback(() => {
    if (labelRaf.current === null) labelRaf.current = requestAnimationFrame(updateLabels);
  }, [updateLabels]);

  const applyTransform = useCallback(() => {
    viewRef.current?.setAttribute("transform", transformRef.current.toString());
    positionMarkers();
    scheduleLabels();
  }, [positionMarkers, scheduleLabels]);

  const onMarkersLayout = useCallback(() => {
    positionMarkers();
    scheduleLabels();
  }, [positionMarkers, scheduleLabels]);

  // --- d3-zoom ----------------------------------------------------------------
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !size || !view) return;
    const extent: Extent = [
      [0, 0],
      [size.w, size.h],
    ];
    const world = view.worldExtent;
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_K, MAX_K])
      .extent(extent)
      .translateExtent(world)
      .on("start", (e: { sourceEvent: Event | null }) => {
        if (e.sourceEvent && animRef.current !== null) {
          cancelAnimationFrame(animRef.current);
          animRef.current = null;
        }
        if (e.sourceEvent) setTooltip(null);
        svg.dataset.zooming = "1";
      })
      .on("zoom", (e: { transform: ZoomTransform }) => {
        transformRef.current = e.transform;
        applyTransform();
      })
      .on("end", () => {
        delete svg.dataset.zooming;
      });
    zoomRef.current = z;
    const sel = select(svg);
    sel.call(z);
    // Re-apply the current transform within the new extent after a resize.
    if (!initialised.current) {
      initialised.current = true;
      // Phones: start centred on the user's own region.
      const home = CITIES.find((c) => c.timeZone === getUserTimeZone());
      const p = home && view.portrait ? view.projection([home.lon, home.lat]) : null;
      if (p) z.translateTo(sel, p[0], size.h / 2);
      else z.transform(sel, zoomIdentity);
    } else {
      z.transform(sel, z.constrain()(transformRef.current, extent, world));
    }
    return () => {
      sel.on(".zoom", null);
    };
  }, [size, view, applyTransform]);

  useEffect(
    () => () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
      if (labelRaf.current !== null) cancelAnimationFrame(labelRaf.current);
    },
    [],
  );

  // --- animated camera ---------------------------------------------------------
  const animateTo = useCallback(
    (target: ZoomTransform, duration?: number) => {
      const svg = svgRef.current;
      const z = zoomRef.current;
      if (!svg || !z || !size || !view) return;
      const extent: Extent = [
        [0, 0],
        [size.w, size.h],
      ];
      const to = z.constrain()(target, extent, view.worldExtent);
      const sel = select(svg);
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
      if (reducedMotion) {
        z.transform(sel, to);
        return;
      }
      const from = transformRef.current;
      const cx = size.w / 2;
      const cy = size.h / 2;
      const a: View = { cx: (cx - from.x) / from.k, cy: (cy - from.y) / from.k, k: from.k };
      const b: View = { cx: (cx - to.x) / to.k, cy: (cy - to.y) / to.k, k: to.k };
      const interp = interpolateView(a, b, size.w);
      const dur = duration ?? flyDuration(a, b, size.w);
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const v = interp(easeInOutCubic(t));
        z.transform(sel, zoomIdentity.translate(cx - v.cx * v.k, cy - v.cy * v.k).scale(v.k));
        animRef.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      animRef.current = requestAnimationFrame(step);
    },
    [size, view, reducedMotion],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      if (!size) return;
      const t = transformRef.current;
      const k = Math.min(MAX_K, Math.max(MIN_K, t.k * factor));
      const cx = size.w / 2;
      const cy = size.h / 2;
      animateTo(
        zoomIdentity.translate(cx - ((cx - t.x) / t.k) * k, cy - ((cy - t.y) / t.k) * k).scale(k),
        380,
      );
    },
    [size, animateTo],
  );

  const resetView = useCallback(() => animateTo(zoomIdentity, 800), [animateTo]);

  // Fly to a city whenever a new request arrives (search, list, dock, marker click).
  useEffect(() => {
    if (!flyRequest || !projection || !size) return;
    const city = CITY_BY_ID.get(flyRequest.cityId);
    const p = city && projection([city.lon, city.lat]);
    if (!p) return;
    const desktop = size.w >= 768;
    const k = Math.max(transformRef.current.k, 3.2);
    const ax = desktop ? (size.w - PANEL_WIDTH) / 2 : size.w / 2;
    const ay = desktop ? size.h / 2 : size.h * 0.3;
    animateTo(zoomIdentity.translate(ax - p[0] * k, ay - p[1] * k).scale(k));
  }, [flyRequest, projection, size, animateTo]);

  // --- interaction --------------------------------------------------------------
  const onHover = useCallback((city: City | null, el: SVGGElement | null) => {
    if (!city || !el) {
      setTooltip(null);
      return;
    }
    const t = transformRef.current;
    setTooltip({ city, x: t.applyX(Number(el.dataset.x)), y: t.applyY(Number(el.dataset.y)) });
  }, []);

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    const z = zoomRef.current;
    if (!svg || !z || e.target !== svg) return;
    const step = 80 / transformRef.current.k;
    const pan: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const d = pan[e.key];
    if (d) {
      e.preventDefault();
      z.translateBy(select(svg), d[0], d[1]);
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomBy(1.6);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      zoomBy(1 / 1.6);
    } else if (e.key === "0") {
      e.preventDefault();
      resetView();
    }
  };

  return (
    <div
      ref={wrapRef}
      className="map-root absolute inset-0 overflow-hidden"
      data-selected={selectedId ?? undefined}
    >
      {size && projection && paths && (
        <svg
          ref={svgRef}
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
          className="block touch-none select-none outline-none focus-visible:outline-none"
          role="application"
          aria-label="Interactive world map. Arrow keys pan, plus and minus zoom, 0 resets. Tab to move between cities."
          aria-describedby={tooltip ? "map-tooltip" : undefined}
          tabIndex={0}
          onKeyDown={onKeyDown}
        >
          <defs>
            <radialGradient id="ocean-glow" cx="50%" cy="45%" r="65%">
              <stop offset="0%" stopColor="var(--ocean-hi)" />
              <stop offset="100%" stopColor="var(--ocean)" />
            </radialGradient>
            <radialGradient id="sun-glow">
              <stop offset="0%" stopColor="#fde68a" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g ref={viewRef}>
            <g className="map-enter">
              <path d={paths.sphere} fill="url(#ocean-glow)" />
              <path
                d={paths.graticule}
                fill="none"
                stroke="var(--graticule)"
                strokeWidth={0.6}
                vectorEffect="non-scaling-stroke"
              />
              <path
                className={cx("map-land", geo && "map-land-ready")}
                d={paths.land}
                fill="var(--land)"
              />
              <path
                d={paths.borders}
                fill="none"
                stroke="var(--land-stroke)"
                strokeWidth={0.6}
                vectorEffect="non-scaling-stroke"
              />
            </g>
            <TerminatorLayer projection={projection} />
            <path
              d={paths.sphere}
              fill="none"
              stroke="var(--border)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </g>
          <g ref={markersRef} className="markers">
            <MarkersLayer points={points} onLayout={onMarkersLayout} onHover={onHover} />
          </g>
        </svg>
      )}

      {error && (
        <p
          role="alert"
          className="glass absolute left-1/2 top-1/2 -translate-x-1/2 rounded-xl px-4 py-3 text-sm"
        >
          Couldn&apos;t load the map outline ({error}). Clocks still work.
        </p>
      )}

      <CityTooltip anchor={tooltip} width={size?.w ?? 0} />

      <div
        className={cx(
          "absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2 transition-[right] duration-500 ease-out",
          selectedId ? "md:right-[440px]" : "md:right-4",
        )}
        role="group"
        aria-label="Map controls"
      >
        <IconButton label="Zoom in" onClick={() => zoomBy(1.6)}>
          <PlusIcon />
        </IconButton>
        <IconButton label="Zoom out" onClick={() => zoomBy(1 / 1.6)}>
          <MinusIcon />
        </IconButton>
        <IconButton label="Reset view" onClick={resetView}>
          <ResetIcon />
        </IconButton>
        <IconButton
          label={showTerminator ? "Hide day/night overlay" : "Show day/night overlay"}
          aria-pressed={showTerminator}
          onClick={() => setSetting("showTerminator", !showTerminator)}
          className={cx(showTerminator && "text-accent")}
        >
          <TwilightIcon />
        </IconButton>
      </div>
    </div>
  );
}
