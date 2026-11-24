import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CITIES, flagEmoji } from "@/data/cities";
import { CityHero } from "@/components/city/city-hero";
import { MiniGlobe } from "@/components/city/mini-globe";
import { PageShell } from "@/components/page-shell";
import { SITE_NAME } from "@/lib/site";

// Static export: every city page is generated at build time; unknown slugs 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return CITIES.map((c) => ({ slug: c.slug }));
}

function findCity(slug: string) {
  return CITIES.find((c) => c.slug === slug);
}

export async function generateMetadata({ params }: PageProps<"/city/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const city = findCity(slug);
  if (!city) return {};
  const title = `Current time in ${city.name}, ${city.country}`;
  const description = `Live local time in ${city.name}, ${city.country} (${city.timeZone.replace(
    /_/g,
    " ",
  )}) — UTC offset, daylight saving status, sunrise and sunset, and the time difference from you.`;
  const url = `/city/${city.slug}/`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url },
    twitter: { card: "summary", title, description },
  };
}

export default async function CityPage({ params }: PageProps<"/city/[slug]">) {
  const { slug } = await params;
  const city = findCity(slug);
  if (!city) notFound();

  const sameZone = CITIES.filter((c) => c.timeZone === city.timeZone && c.id !== city.id);
  const sameCountry = CITIES.filter(
    (c) => c.countryCode === city.countryCode && c.id !== city.id && c.timeZone !== city.timeZone,
  );
  const related = [...sameZone, ...sameCountry].slice(0, 8);

  return (
    <PageShell>
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-fg-muted">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-fg">
              Map
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-fg">
            {city.name}
          </li>
        </ol>
      </nav>
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <header>
            <p className="flex items-center gap-2 text-sm font-medium text-accent">
              <span aria-hidden className="text-xl">
                {flagEmoji(city.countryCode)}
              </span>
              {city.country} · <span className="time-nums">{city.timeZone.replace(/_/g, " ")}</span>
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
              Time in {city.name}
            </h1>
          </header>
          <CityHero city={city} />
        </div>
        <aside className="space-y-6">
          <MiniGlobe city={city} />
          {related.length > 0 && (
            <div className="rounded-3xl border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold">
                {sameZone.length ? "Same time zone & nearby" : `More in ${city.country}`}
              </h2>
              <ul className="mt-3 space-y-1">
                {related.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/city/${c.slug}/`}
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2"
                    >
                      <span>
                        <span aria-hidden className="mr-2">
                          {flagEmoji(c.countryCode)}
                        </span>
                        {c.name}
                      </span>
                      <span className="text-xs text-fg-muted">
                        {c.timeZone === city.timeZone ? "Same zone" : c.timeZone.replace(/_/g, " ")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </PageShell>
  );
}
