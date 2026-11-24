"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { formatTime, splitMeridiem } from "@/lib/time/format";
import { useSettings } from "@/lib/store/settings";
import { useTicked } from "@/lib/store/ticker";
import { cx } from "@/components/ui/primitives";

interface LiveTimeProps {
  timeZone: string;
  /** Override the global show-seconds setting. */
  seconds?: boolean;
  /** Prefix for the accessible label, e.g. "Time in Karachi". */
  label?: string;
  /** Animate digit changes (bookmarked clock cards only). */
  animated?: boolean;
  focusable?: boolean;
  className?: string;
  meridiemClassName?: string;
}

/**
 * A live clock. Renders a stable skeleton until the global ticker starts after
 * mount, then re-renders only when its formatted string changes.
 * role="timer" (implicit aria-live="off") so screen readers don't announce each
 * second; the accessible label carries the minute-precision time on focus.
 */
export function LiveTime({
  timeZone,
  seconds,
  label = "Current time",
  animated = false,
  focusable = false,
  className,
  meridiemClassName,
}: LiveTimeProps) {
  const hour12 = useSettings((s) => s.hour12);
  const showSeconds = useSettings((s) => s.showSeconds);
  const withSeconds = seconds ?? showSeconds;
  const text = useTicked((now) => formatTime(now, timeZone, { hour12, seconds: withSeconds }));
  const spoken = useTicked((now) => formatTime(now, timeZone, { hour12, seconds: false }));

  const skeleton = withSeconds ? "--:--:--" : "--:--";
  const [main, meridiem] = text ? splitMeridiem(text) : [skeleton, ""];

  return (
    <span
      role="timer"
      aria-live="off"
      aria-atomic="true"
      aria-label={spoken ? `${label}: ${spoken}` : `${label}: loading`}
      tabIndex={focusable ? 0 : undefined}
      className={cx("time-nums inline-flex items-baseline whitespace-nowrap", className)}
    >
      <span aria-hidden="true" className={cx(!text && "opacity-40")}>
        {animated && text ? <AnimatedDigits text={main} /> : main}
      </span>
      {meridiem && (
        <span aria-hidden="true" className={cx("ml-1 text-[0.5em] font-medium", meridiemClassName)}>
          {meridiem}
        </span>
      )}
    </span>
  );
}

/** Per-character slot; changed characters slide in from above. */
function AnimatedDigits({ text }: { text: string }) {
  return (
    <>
      {[...text].map((ch, i) => (
        // Slot is exactly one line tall so the roll clips cleanly at its edges.
        <span key={i} className="relative inline-grid h-[1.15em] overflow-hidden leading-[1.15em]">
          <AnimatePresence initial={false}>
            <m.span
              key={ch}
              className="[grid-area:1/1]"
              initial={{ y: "-100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {ch}
            </m.span>
          </AnimatePresence>
        </span>
      ))}
    </>
  );
}
