import type { MetadataRoute } from "next";
import { CITIES } from "@/data/cities";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL.replace(/\/$/, "");
  return [
    { url: `${base}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/bookmarks/`, changeFrequency: "yearly", priority: 0.3 },
    ...CITIES.map((c) => ({
      url: `${base}/city/${c.slug}/`,
      changeFrequency: "yearly" as const,
      priority: c.priority === 1 ? 0.8 : 0.6,
    })),
  ];
}
