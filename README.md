# World Clock

An animated, map-based world clock. Live local times for ~160 cities on an interactive
Equal Earth map with a real-time day/night terminator, a command-palette search, city
pages, bookmarks ("My Clocks"), and time-zone "moments" you can save and share.

Built with Next.js (App Router) as a **fully static export** for AWS S3 + CloudFront.
No server, no API, no third-party requests at runtime — times come from the device clock
and the IANA time-zone database built into the browser (`Intl`).

## Features

- **Full-screen map** — Equal Earth projection, pan/zoom (wheel, pinch, drag, keyboard,
  +/− and reset), graticule, live terminator with layered twilight bands, sun position.
- **Live markers** — ~160 cities with live `HH:mm` labels, day/night markers (filled vs.
  hollow), priority-based label reveal with collision culling, pulsing star for bookmarks.
- **Tooltip & detail panel** — local time, date, UTC offset, difference from you,
  DST status and next transition, sunrise/sunset/day length; side panel on desktop,
  bottom sheet on mobile.
- **Search** — Ctrl/⌘+K or `/`; fuzzy match on city, country, zone and abbreviation;
  selecting flies the map to the city.
- **List view** — sortable by name, UTC offset or difference from you.
- **City pages** — `/city/[slug]/` for every city (static, with SEO metadata and a
  server-rendered mini globe).
- **Bookmarks** — star cities, custom labels, drag-to-reorder (pointer, touch, keyboard),
  moments ("Tomorrow 3 PM in Karachi" across all your clocks), share links,
  JSON export/import.
- **Settings** — dark/light theme, 12/24h, seconds, terminator.

## Requirements

- Node.js >= 20.9

## Scripts

| Command             | What it does                                                          |
| ------------------- | --------------------------------------------------------------------- |
| `npm run dev`       | Local dev server                                                      |
| `npm run build`     | Static export into `out/` (+ `postbuild` segment-file fix, see below) |
| `npm run preview`   | Serve `out/` on :4000 with the same routing as CloudFront             |
| `npm test`          | Vitest unit tests (`lib/**`)                                          |
| `npm run test:e2e`  | Playwright smoke test against `out/` (run `npm run build` first)      |
| `npm run lint`      | ESLint, zero warnings allowed                                         |
| `npm run typecheck` | Generate Next route types, then `tsc --noEmit`                        |
| `npm run verify`    | lint + typecheck + format check + unit tests + build                  |

First-time e2e setup: `npx playwright install chromium`.

## Project layout

```
app/                 routes: /, /city/[slug], /bookmarks, /settings, not-found, sitemap, robots
components/          map/, home/, city/, clock/, search/, bookmarks/, settings/, ui/
lib/time/            pure, tested time utilities (Intl-based offsets, DST, formatting, sun, terminator)
lib/store/           Zustand stores: ticker (one global 1 s ticker), settings, bookmarks, ui
lib/map, lib/search  label collision, fly-to interpolation, fuzzy search (all pure + tested)
data/cities.ts       city data (IANA zones only — no hardcoded offsets)
public/data/         world-atlas 110m TopoJSON (served locally)
scripts/             deploy.sh, preview.mjs, fix-segment-files.mjs
infra/               CloudFront Function (+ local test)
e2e/                 Playwright smoke test
```

### Architecture notes

- **One ticker.** `lib/store/ticker.ts` fires on each second boundary, pauses when the tab
  is hidden and resyncs on return. Components subscribe through selectors that return the
  _formatted_ string, so a component re-renders only when its text changes (map labels
  once a minute, dock clocks once a second).
- **Cheap map frames.** The base map is a static SVG layer transformed by d3-zoom; city
  markers and labels live outside that group and are repositioned imperatively on each
  zoom frame (no React re-render while panning/zooming).
- **No hydration mismatches.** All time-dependent UI renders a stable skeleton in the
  static HTML and fills in after mount. Persisted stores rehydrate after mount; the theme
  is applied by a tiny inline script before first paint.
- **Validated input.** localStorage, URL params (`/?city=`, shared moments) and imported
  JSON are validated with Zod (`zod/mini`). Invalid stored data is discarded field-by-field;
  the stores never merge or write before validation has run.
- **Bundle budget.** Initial JS for `/` is ~181 KB gzipped (React + Next.js ≈ 136 KB of
  that). The map chunk (d3 + topojson, ~22 KB gz) and the Zod validators (~17 KB gz) load
  in parallel right after hydration; search, list, settings, panel and import dialog are
  lazy-loaded on first use.

### Known build quirk (Windows)

On Windows, Next.js 16.4 writes per-segment prefetch files into nested folders
(`__next.bookmarks/__PAGE__.txt`) instead of the flat names the client router requests
(`__next.bookmarks.__PAGE__.txt`), which causes harmless-but-noisy 404s on prefetch.
`scripts/fix-segment-files.mjs` runs as `postbuild` and flattens them. On Linux/macOS it
does nothing.

## Deploying to AWS (S3 + CloudFront)

The deploy script only uploads files and creates an invalidation. Creating the bucket,
distribution, function and policies below is a one-time manual/IaC step.

### 1. S3 bucket (private)

- Create a bucket (any region). **Block all public access: ON.** No static-website hosting.
- Bucket policy: allow `s3:GetObject` only for your CloudFront distribution via
  **Origin Access Control (OAC)** — CloudFront generates this policy when you attach OAC:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalReadOnly",
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR_BUCKET/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

### 2. CloudFront distribution

- **Origin:** the S3 bucket's REST endpoint (not the website endpoint) with **OAC** (sign
  requests). No public bucket access needed.
- **Default root object:** `index.html`.
- **Viewer protocol policy:** _Redirect HTTP to HTTPS_.
- **Compression:** enabled (gzip + Brotli) — the map TopoJSON compresses ~3×.
- **Cache policy:** `CachingOptimized` (it honours the `Cache-Control` headers set by
  `deploy.sh`: hashed assets are immutable, everything else `max-age=0, must-revalidate`).
  Include query strings in the cache key **only if** you want share links cached
  separately; the default (no query strings in key) is fine because pages read the query
  on the client.
- **Function association (viewer request):** `infra/cloudfront-function.js`
  (runtime `cloudfront-js-2.0`). It rewrites `/path` and `/path/` to `/path/index.html`.
  Test locally with `node infra/cloudfront-function.test.mjs`.
- **Custom error responses:** with OAC, S3 returns **403** for missing keys. Map both
  `403` and `404` → response page `/404.html`, HTTP response code `404`, error caching
  TTL e.g. 60 s.

### 3. Response headers policy

Attach a custom response headers policy with security headers:

| Header                      | Value                                          |
| --------------------------- | ---------------------------------------------- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options`    | `nosniff`                                      |
| `X-Frame-Options`           | `DENY`                                         |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`              |
| `Content-Security-Policy`   | see below                                      |

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests
```

Why `'unsafe-inline'`: a static export can't use per-request nonces, and Next.js inlines
its RSC payload bootstrap scripts (`self.__next_f.push(...)`) into every HTML page, plus
the small theme script in `<head>`. Everything is first-party; there are no third-party
scripts, fonts, analytics or CDNs. `style-src 'unsafe-inline'` is needed for inline style
attributes used by animations. `connect-src 'self'` covers the map data fetch.

### 4. Deploy

```bash
export S3_BUCKET=your-bucket
export CLOUDFRONT_DISTRIBUTION_ID=E123EXAMPLE
export AWS_PROFILE=your-profile          # optional
export NEXT_PUBLIC_SITE_URL=https://clock.example.com
./scripts/deploy.sh                      # DRY_RUN=1 to preview, SKIP_BUILD=1 to reuse out/
```

What it does:

1. `npm run build` (static export to `out/`).
2. `aws s3 sync` in two passes:
   - `_next/static/*` with `Cache-Control: public, max-age=31536000, immutable` (first, so
     new HTML never points at a missing chunk);
   - everything else with `Cache-Control: public, max-age=0, must-revalidate`.
3. `--delete` in both passes to remove stale files. (If you need zero-downtime for users
   holding an old tab open, drop `--delete` from the first pass and prune old chunks
   occasionally.)
4. CloudFront invalidation for `/*`.

All AWS values come from environment variables; nothing is stored in the repo.

## Privacy

No cookies, no analytics, no external requests. Bookmarks and settings live in
`localStorage` in your browser only. Fonts are self-hosted via `next/font`.
