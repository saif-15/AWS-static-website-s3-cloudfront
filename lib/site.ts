export const SITE_NAME = "World Clock";

export const SITE_DESCRIPTION =
  "Live local times for cities around the world on an interactive map, with a day/night terminator, bookmarks, and time conversion.";

/**
 * Absolute origin used for Open Graph / canonical URLs. Set at build time via
 * NEXT_PUBLIC_SITE_URL (e.g. https://clock.example.com). Not a secret.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
