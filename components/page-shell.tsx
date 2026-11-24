"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/home/top-bar";
import { GlobeIcon, SearchIcon, SettingsIcon, StarIcon } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";
import { useUI } from "@/lib/store/ui";

const NAV = [
  { href: "/", label: "Map", icon: GlobeIcon },
  { href: "/bookmarks/", label: "My Clocks", icon: StarIcon },
  { href: "/settings/", label: "Settings", icon: SettingsIcon },
] as const;

/** Header + main container for the non-map pages. */
export function PageShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const setSearchOpen = useUI((s) => s.setSearchOpen);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <Logo />
            World Clock
          </Link>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search cities"
            className="flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm text-fg-muted hover:text-fg"
          >
            <SearchIcon size={16} />
            <span className="hidden sm:inline">Search</span>
          </button>
          <nav aria-label="Primary">
            <ul className="flex items-center gap-1">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/" ? pathname === "/" : pathname.startsWith(href.slice(0, -1));
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "flex h-10 items-center gap-2 rounded-xl px-3 text-sm transition-colors",
                        active
                          ? "bg-surface-2 text-fg"
                          : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                      )}
                    >
                      <Icon size={16} />
                      <span className="hidden sm:inline">{label}</span>
                      <span className="sr-only sm:hidden">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:py-12">
        {children}
      </main>
      <footer className="border-t border-border/60 py-6 text-center text-xs text-fg-muted">
        Times come from your device clock and the IANA time zone database built into your browser.
      </footer>
    </>
  );
}
