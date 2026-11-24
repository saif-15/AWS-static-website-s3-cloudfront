import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <PageShell>
      <section className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
        <p className="time-nums text-sm text-accent">404</p>
        <h1 className="text-3xl font-semibold tracking-tight">This place isn&apos;t on the map</h1>
        <p className="text-fg-muted">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          href="/"
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
        >
          Back to the map
        </Link>
      </section>
    </PageShell>
  );
}
