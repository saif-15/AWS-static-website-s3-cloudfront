"use client";

import * as m from "motion/react-m";
import { StarIcon } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";
import { useBookmarks, useIsBookmarked } from "@/lib/store/bookmarks";

/** Star toggle with a small pop. Filled vs. outline shape + label — never colour alone. */
export function BookmarkStar({
  cityId,
  cityName,
  showText = false,
  size = "md",
  className,
}: {
  cityId: string;
  cityName: string;
  showText?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const bookmarked = useIsBookmarked(cityId);
  const toggle = useBookmarks((s) => s.toggleCity);
  const label = bookmarked ? `Remove ${cityName} from My Clocks` : `Add ${cityName} to My Clocks`;

  return (
    <button
      type="button"
      aria-pressed={bookmarked}
      aria-label={showText ? undefined : label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        toggle(cityId);
      }}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl transition-colors",
        showText ? "px-3 py-2 text-sm font-medium" : size === "sm" ? "size-8" : "size-10",
        bookmarked
          ? "bg-accent/15 text-accent hover:bg-accent/25"
          : "text-fg-muted hover:bg-surface-2 hover:text-fg",
        showText && !bookmarked && "border border-border",
        className,
      )}
    >
      <m.span
        key={bookmarked ? "on" : "off"}
        initial={{ scale: bookmarked ? 0.4 : 1, rotate: bookmarked ? -30 : 0 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 520, damping: 14 }}
        className="inline-flex"
      >
        <StarIcon filled={bookmarked} size={size === "sm" ? 16 : 18} />
      </m.span>
      {showText && <span>{bookmarked ? "In My Clocks" : "Add to My Clocks"}</span>}
    </button>
  );
}
