import type { ButtonHTMLAttributes, ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  variant?: "ghost" | "glass" | "solid";
  size?: "sm" | "md" | "lg";
};

/** Icon-only button with an accessible name and a native tooltip. */
export function IconButton({
  label,
  children,
  variant = "glass",
  size = "md",
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-xl transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" && "size-8",
        size === "md" && "size-10",
        size === "lg" && "size-11",
        variant === "glass" && "glass text-fg hover:bg-surface-2",
        variant === "ghost" && "text-fg-muted hover:bg-surface-2 hover:text-fg",
        variant === "solid" && "bg-accent text-accent-fg hover:brightness-110",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="time-nums rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] text-fg-muted">
      {children}
    </kbd>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl px-3 py-3 text-left hover:bg-surface-2"
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-fg-muted">{description}</span>}
      </span>
      <span
        aria-hidden
        className={cx(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
          checked ? "border-accent bg-accent" : "border-border bg-surface-2",
        )}
      >
        <span
          className={cx(
            "absolute size-4 rounded-full shadow transition-transform",
            checked ? "translate-x-6 bg-accent-fg" : "translate-x-1 bg-fg-muted",
          )}
        />
        <span className="sr-only">{checked ? "On" : "Off"}</span>
      </span>
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
            value === o.value
              ? "bg-surface text-fg shadow-sm ring-1 ring-border"
              : "text-fg-muted hover:text-fg",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
