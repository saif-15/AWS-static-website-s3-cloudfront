"use client";

import { useRef, useState } from "react";
import * as m from "motion/react-m";
import { CloseIcon, UploadIcon } from "@/components/ui/icons";
import { IconButton, Segmented } from "@/components/ui/primitives";
import { useDialog } from "@/components/ui/use-dialog";
import { useBookmarks } from "@/lib/store/bookmarks";
import { parseImportFile, type ParsedImport } from "@/lib/store/validation";

const MAX_BYTES = 1_000_000;

/** Import bookmarks from a JSON export (validated with Zod). Lazy-loaded. */
export function ImportDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const importData = useBookmarks((s) => s.importData);
  const [result, setResult] = useState<ParsedImport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  useDialog(ref, onClose);

  const onFile = async (file: File | undefined) => {
    setResult(null);
    setError(null);
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError("That file is too large (max 1 MB).");
      return;
    }
    try {
      setResult(parseImportFile(await file.text()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that file.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <m.div
        aria-hidden
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <m.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="glass-strong relative w-full max-w-md rounded-3xl p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="import-title" className="text-lg font-semibold">
            Import bookmarks
          </h2>
          <IconButton label="Close" variant="ghost" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-6 text-center text-sm hover:border-accent">
          <UploadIcon className="text-accent" />
          <span className="font-medium">Choose a World Clock JSON export</span>
          <span className="text-xs text-fg-muted">Validated before anything is changed</span>
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </label>

        <div aria-live="polite" className="mt-4 space-y-3 text-sm">
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-700 dark:text-red-200"
            >
              {error}
            </p>
          )}
          {result && (
            <>
              <p className="rounded-xl bg-surface-2 p-3">
                Found <strong>{result.data.cities.length}</strong> cities and{" "}
                <strong>{result.data.moments.length}</strong> moments.
                {(result.droppedCities > 0 || result.droppedMoments > 0) && (
                  <span className="block text-xs text-fg-muted">
                    Skipped {result.droppedCities + result.droppedMoments} invalid or duplicate
                    entries.
                  </span>
                )}
              </p>
              <Segmented
                label="Import mode"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "merge", label: "Merge with mine" },
                  { value: "replace", label: "Replace mine" },
                ]}
              />
              <button
                type="button"
                onClick={() => {
                  importData(result.data, mode);
                  onClose();
                }}
                className="w-full rounded-xl bg-accent px-4 py-2.5 font-medium text-accent-fg"
              >
                Import
              </button>
            </>
          )}
        </div>
      </m.div>
    </div>
  );
}
