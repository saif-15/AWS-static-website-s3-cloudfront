"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "motion/react";
import { preload } from "react-dom";
import { WORLD_URL } from "@/components/map/use-world-geo";
import { useLocationSearch } from "@/lib/hooks";
import { useUI } from "@/lib/store/ui";
import { ClockDock } from "./clock-dock";
import { TopBar } from "./top-bar";

// The map can only render after mount (it sizes itself to the viewport), so its
// d3/topojson code is a separate chunk fetched in parallel with hydration.
const WorldMap = dynamic(() => import("@/components/map/world-map").then((m) => m.WorldMap), {
  ssr: false,
  loading: () => <MapSkeleton />,
});
const CityPanel = dynamic(() => import("./city-panel").then((m) => m.CityPanel), { ssr: false });

function MapSkeleton() {
  return (
    <div aria-hidden className="absolute inset-0 grid place-items-center">
      <div className="map-skeleton aspect-[2.05/1] w-[92%] max-w-[1600px] rounded-[50%] opacity-60" />
    </div>
  );
}

// Non-critical UI is code-split and only loaded when opened.
const CityList = dynamic(() => import("./city-list").then((m) => m.CityList), { ssr: false });
const SettingsSheet = dynamic(
  () => import("@/components/settings/settings-sheet").then((m) => m.SettingsSheet),
  {
    ssr: false,
  },
);

export function HomeExperience() {
  // Start downloading the map outline straight from the HTML.
  preload(WORLD_URL, { as: "fetch", crossOrigin: "anonymous" });
  const listOpen = useUI((s) => s.listOpen);
  const settingsOpen = useUI((s) => s.settingsOpen);
  const search = useLocationSearch();

  // Deep link: /?city=karachi flies to the city (validated with Zod).
  useEffect(() => {
    if (!search) return;
    const id = new URLSearchParams(search).get("city");
    window.history.replaceState(null, "", "/");
    if (!id) return;
    let alive = true;
    void import("@/lib/store/schemas").then(({ cityIdSchema }) => {
      const parsed = cityIdSchema.safeParse(id);
      if (alive && parsed.success) useUI.getState().selectCity(parsed.data, { fly: true });
    });
    return () => {
      alive = false;
    };
  }, [search]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-bg">
      <WorldMap />
      <TopBar />
      <ClockDock />
      <CityPanel />
      <AnimatePresence>{listOpen && <CityList key="list" />}</AnimatePresence>
      <AnimatePresence>{settingsOpen && <SettingsSheet key="settings" />}</AnimatePresence>
    </div>
  );
}
