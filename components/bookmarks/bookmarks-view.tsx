"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "motion/react";
import { CITY_BY_ID } from "@/data/cities";
import { DownloadIcon, UploadIcon } from "@/components/ui/icons";
import { useLocationSearch } from "@/lib/hooks";
import { parseShareQuery } from "@/lib/share";
import { useBookmarks } from "@/lib/store/bookmarks";
import { buildExportFile } from "@/lib/store/validation";
import { useBookmarksHydrated } from "@/lib/store/hydration";
import { cityIdSchema } from "@/lib/store/schemas";
import { ClockGrid } from "./clock-grid";
import { MomentPlanner, type PlannerSeed } from "./moment-planner";
import { MomentsList } from "./moments-list";

const ImportDialog = dynamic(() => import("./import-dialog").then((m) => m.ImportDialog), {
  ssr: false,
});

function Section({
  id,
  title,
  description,
  actions,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={id} className="text-xl font-semibold tracking-tight">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function exportBookmarks() {
  const { cities, moments } = useBookmarks.getState();
  const blob = new Blob([JSON.stringify(buildExportFile({ cities, moments }), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `world-clock-bookmarks-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Skeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-56 animate-pulse rounded-3xl bg-surface-2" />
      ))}
    </div>
  );
}

export function BookmarksView() {
  const hydrated = useBookmarksHydrated();
  const search = useLocationSearch();
  const [importOpen, setImportOpen] = useState(false);
  const [seed, setSeed] = useState<{ value: PlannerSeed; n: number } | null>(null);

  // Validated URL input: a shared moment (?city&at&name&note) or just ?city=.
  const fromUrl = useMemo(() => {
    if (!search) return { seed: undefined, shared: null, invalid: false };
    const shared = parseShareQuery(search);
    if (shared) {
      return {
        seed: { cityId: shared.city, local: shared.at, name: shared.name, note: shared.note },
        shared,
        invalid: false,
      };
    }
    const q = new URLSearchParams(search);
    const city = cityIdSchema.safeParse(q.get("city"));
    if (city.success && !q.has("at"))
      return { seed: { cityId: city.data }, shared: null, invalid: false };
    return { seed: undefined, shared: null, invalid: q.has("city") || q.has("at") };
  }, [search]);

  const plannerSeed = seed?.value ?? fromUrl.seed;
  const sharedCity = fromUrl.shared ? CITY_BY_ID.get(fromUrl.shared.city) : undefined;

  return (
    <div className="space-y-14">
      <header>
        <p className="text-sm font-medium text-accent">Bookmarks</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">My Clocks</h1>
        <p className="mt-2 max-w-2xl text-fg-muted">
          Your pinned cities, plus moments you&apos;ve planned across time zones. Everything is
          stored only in this browser.
        </p>
      </header>

      {fromUrl.shared && sharedCity && (
        <div role="status" className="rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm">
          <strong>Shared moment{fromUrl.shared.name ? `: ${fromUrl.shared.name}` : ""}</strong> —
          loaded into the planner below ({sharedCity.name}). Save it to keep it.
        </div>
      )}
      {fromUrl.invalid && (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm"
        >
          This share link is invalid or incomplete, so it was ignored.
        </div>
      )}

      <Section
        id="clocks-title"
        title="Clocks"
        description="Drag the handle (or focus it and press Space, then arrow keys) to reorder."
      >
        {hydrated ? <ClockGrid /> : <Skeleton />}
      </Section>

      <Section
        id="planner-title"
        title="Plan a moment"
        description="Pick a date and time in one city to see it everywhere you care about."
      >
        {hydrated ? (
          <div id="planner" className="rounded-3xl border border-border bg-surface p-5 md:p-6">
            <MomentPlanner key={`${seed?.n ?? 0}-${search}`} seed={plannerSeed} />
          </div>
        ) : (
          <div className="h-72 animate-pulse rounded-3xl bg-surface-2" aria-hidden />
        )}
      </Section>

      <Section id="moments-title" title="Saved moments">
        {hydrated ? (
          <MomentsList
            onOpen={(value) => {
              setSeed((s) => ({ value, n: (s?.n ?? 0) + 1 }));
              document
                .getElementById("planner")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />
        ) : (
          <div className="h-24 animate-pulse rounded-3xl bg-surface-2" aria-hidden />
        )}
      </Section>

      <Section
        id="data-title"
        title="Backup"
        description="Export your clocks and moments to a JSON file, or import one (merged or replacing)."
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportBookmarks}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface-2"
          >
            <DownloadIcon size={16} /> Export JSON
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface-2"
          >
            <UploadIcon size={16} /> Import JSON
          </button>
        </div>
      </Section>

      <AnimatePresence>
        {importOpen && <ImportDialog key="import" onClose={() => setImportOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
