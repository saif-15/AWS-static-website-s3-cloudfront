import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata: Metadata = {
  title: "Settings",
  description: "Theme, 12/24-hour time, seconds, and the day/night map overlay.",
  alternates: { canonical: "/settings/" },
};

export default function SettingsPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-lg">
        <p className="text-sm font-medium text-accent">Preferences</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Settings</h1>
        <div className="mt-8 rounded-3xl border border-border bg-surface p-6">
          <SettingsForm />
        </div>
      </div>
    </PageShell>
  );
}
