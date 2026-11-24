import type { NextConfig } from "next";

/**
 * Static export for S3 + CloudFront.
 *
 * - `output: "export"` emits a fully static site into `out/`. No Node server at runtime.
 * - `trailingSlash: true` emits `/route/index.html`, which pairs with the CloudFront
 *   viewer-request function that rewrites `/route` and `/route/` to `/route/index.html`.
 * - `images.unoptimized` because the default image optimizer needs a server.
 *
 * The scaffold's `cacheComponents` / `partialPrefetching` flags are intentionally
 * removed: they are server-rendering (PPR) features with no benefit for a static export.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
