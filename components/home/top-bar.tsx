"use client";

import Link from "next/link";
import { GlobeIcon, ListIcon, SearchIcon, SettingsIcon, StarIcon } from "@/components/ui/icons";
import { IconButton, Kbd, cx } from "@/components/ui/primitives";
import { useUI } from "@/lib/store/ui";
import { useHydrated } from "@/lib/hooks";
import { UtcClock, YourTime } from "./your-time";

export function Logo() {
  return (
    <span
      aria-hidden
      className="relative grid size-8 place-items-center rounded-xl bg-accent/15 text-accent"
    >
      <GlobeIcon size={18} />
    </span>
  );
}

function ShortcutHint() {
  const hydrated = useHydrated();
  const mac = hydrated && /Mac|iPhone|iPad/.test(navigator.platform);
  return <Kbd>{mac ? "⌘" : "Ctrl"} K</Kbd>;
}

export function TopBar() {
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  const listOpen = useUI((s) => s.listOpen);
  const setListOpen = useUI((s) => s.setListOpen);
  const setSettingsOpen = useUI((s) => s.setSettingsOpen);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex flex-col gap-2 p-3 md:p-4">
      <div className="flex items-center gap-2 md:items-start md:gap-3">
        <Link
          href="/"
          className="glass pointer-events-auto flex h-12 items-center gap-2.5 rounded-2xl pl-2 pr-3.5"
        >
          <Logo />
          <h1 className="text-[15px] font-semibold tracking-tight">World Clock</h1>
        </Link>
        <div className="hidden md:block">
          <YourTime />
        </div>
        <UtcClock />

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="glass pointer-events-auto hidden h-12 w-72 items-center gap-2.5 rounded-2xl px-3.5 text-sm text-fg-muted transition-colors hover:text-fg lg:flex"
        >
          <SearchIcon />
          <span className="flex-1 text-left">Search cities, countries, zones…</span>
          <ShortcutHint />
        </button>

        <nav aria-label="Primary" className="pointer-events-auto flex items-center gap-2">
          <IconButton
            label="Search cities"
            className="lg:hidden"
            size="lg"
            onClick={() => setSearchOpen(true)}
          >
            <SearchIcon />
          </IconButton>
          <IconButton
            label={listOpen ? "Show map" : "Show city list"}
            aria-pressed={listOpen}
            size="lg"
            onClick={() => setListOpen(!listOpen)}
            className={cx(listOpen && "text-accent")}
          >
            <ListIcon />
          </IconButton>
          <Link
            href="/bookmarks/"
            aria-label="My Clocks and moments"
            title="My Clocks and moments"
            className="glass inline-flex size-11 items-center justify-center rounded-xl hover:bg-surface-2"
          >
            <StarIcon />
          </Link>
          <IconButton label="Settings" size="lg" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
          </IconButton>
        </nav>
      </div>
      <div className="md:hidden">
        <YourTime compact />
      </div>
    </header>
  );
}
