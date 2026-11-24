"use client";

import { useRef } from "react";
import * as m from "motion/react-m";
import { CloseIcon } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/primitives";
import { useDialog } from "@/components/ui/use-dialog";
import { useIsDesktop } from "@/lib/hooks";
import { useUI } from "@/lib/store/ui";
import { SettingsForm } from "./settings-form";

/** Settings as a side sheet (desktop) / bottom sheet (mobile). Lazy-loaded. */
export function SettingsSheet() {
  const setOpen = useUI((s) => s.setSettingsOpen);
  const ref = useRef<HTMLDivElement>(null);
  const desktop = useIsDesktop();
  const close = () => setOpen(false);
  useDialog(ref, close);
  const hidden = desktop ? { x: "calc(100% + 32px)" } : { y: "100%" };

  return (
    <div className="fixed inset-0 z-50">
      <m.div
        aria-hidden
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
      />
      <m.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        initial={hidden}
        animate={{ x: 0, y: 0 }}
        exit={hidden}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        className="glass-strong absolute inset-x-0 bottom-0 rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl md:inset-x-auto md:bottom-4 md:right-4 md:top-4 md:w-[380px] md:rounded-3xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="settings-title" className="text-lg font-semibold tracking-tight">
            Settings
          </h2>
          <IconButton label="Close settings" variant="ghost" onClick={close} autoFocus>
            <CloseIcon />
          </IconButton>
        </div>
        <SettingsForm />
      </m.div>
    </div>
  );
}
