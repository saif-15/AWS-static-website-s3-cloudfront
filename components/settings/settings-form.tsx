"use client";

import { MoonIcon, SunIcon } from "@/components/ui/icons";
import { Segmented, Switch } from "@/components/ui/primitives";
import { useSettings } from "@/lib/store/settings";

export function SettingsForm() {
  const s = useSettings();
  return (
    <div className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
          Theme
        </legend>
        <Segmented
          label="Theme"
          value={s.theme}
          onChange={(v) => s.set("theme", v)}
          options={[
            { value: "dark", label: "Dark", icon: <MoonIcon size={15} /> },
            { value: "light", label: "Light", icon: <SunIcon size={15} /> },
          ]}
        />
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
          Time format
        </legend>
        <Segmented
          label="Time format"
          value={s.hour12 ? "12" : "24"}
          onChange={(v) => s.set("hour12", v === "12")}
          options={[
            { value: "24", label: "24-hour" },
            { value: "12", label: "12-hour" },
          ]}
        />
      </fieldset>
      <div className="-mx-3 divide-y divide-border">
        <Switch
          label="Show seconds"
          description="On clocks, the panel and My Clocks cards"
          checked={s.showSeconds}
          onChange={(v) => s.set("showSeconds", v)}
        />
        <Switch
          label="Day/night overlay"
          description="Live terminator with twilight bands on the map"
          checked={s.showTerminator}
          onChange={(v) => s.set("showTerminator", v)}
        />
      </div>
      <p className="text-xs text-fg-muted">
        Settings are saved in this browser only. Times come from your device clock — nothing is sent
        anywhere.
      </p>
    </div>
  );
}
