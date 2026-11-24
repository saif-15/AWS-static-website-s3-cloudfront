#!/usr/bin/env bash
# Deploy the static export to S3 + CloudFront.
#
# Required environment variables (never commit these values):
#   S3_BUCKET                    target bucket name (e.g. my-world-clock-site)
#   CLOUDFRONT_DISTRIBUTION_ID   distribution in front of the bucket
# Optional:
#   AWS_PROFILE                  named AWS CLI profile (defaults to the CLI's default chain)
#   NEXT_PUBLIC_SITE_URL         absolute site origin for canonical/OG URLs (recommended)
#   SKIP_BUILD=1                 deploy the existing out/ without rebuilding
#   DRY_RUN=1                    show what would change without uploading or invalidating
#
# Usage:
#   S3_BUCKET=… CLOUDFRONT_DISTRIBUTION_ID=… AWS_PROFILE=… ./scripts/deploy.sh
set -euo pipefail
# Note: arrays are expanded as ${A[@]+"${A[@]}"} so empty arrays work under set -u on bash 3.2 (macOS).

: "${S3_BUCKET:?Set S3_BUCKET}"
: "${CLOUDFRONT_DISTRIBUTION_ID:?Set CLOUDFRONT_DISTRIBUTION_ID}"

cd "$(dirname "$0")/.."

PROFILE_ARGS=()
if [[ -n "${AWS_PROFILE:-}" ]]; then
  PROFILE_ARGS=(--profile "$AWS_PROFILE")
fi
DRY_ARGS=()
if [[ "${DRY_RUN:-}" == "1" ]]; then
  DRY_ARGS=(--dryrun)
  echo "DRY RUN — nothing will be uploaded or invalidated."
fi

if [[ -z "${NEXT_PUBLIC_SITE_URL:-}" ]]; then
  echo "warning: NEXT_PUBLIC_SITE_URL is not set; canonical/OG URLs will point at localhost." >&2
fi

# 1. Production build (static export into out/; postbuild fixes segment files).
if [[ "${SKIP_BUILD:-}" != "1" ]]; then
  echo "==> Building"
  npm run build
fi
[[ -f out/index.html ]] || { echo "out/index.html missing — build failed?" >&2; exit 1; }

DEST="s3://${S3_BUCKET}"
IMMUTABLE="public, max-age=31536000, immutable"
REVALIDATE="public, max-age=0, must-revalidate"

# 2a. Fingerprinted assets: cache forever. Upload these FIRST so new HTML never
#     references a chunk that isn't there yet.
echo "==> Syncing hashed assets (immutable)"
aws s3 sync out/_next/static "${DEST}/_next/static" \
  ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"} ${DRY_ARGS[@]+"${DRY_ARGS[@]}"} \
  --delete \
  --cache-control "$IMMUTABLE"

# 2b. Everything else (HTML, RSC .txt payloads, map data, icons, robots, sitemap):
#     always revalidate so deploys show up immediately.
echo "==> Syncing HTML and other files (must-revalidate)"
aws s3 sync out "${DEST}" \
  ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"} ${DRY_ARGS[@]+"${DRY_ARGS[@]}"} \
  --delete \
  --exclude "_next/static/*" \
  --cache-control "$REVALIDATE"

# 3. (--delete above removes stale files in both passes.)

# 4. Invalidate CloudFront so edge caches pick up the new HTML.
if [[ "${DRY_RUN:-}" == "1" ]]; then
  echo "==> Would create CloudFront invalidation for /* on ${CLOUDFRONT_DISTRIBUTION_ID}"
else
  echo "==> Creating CloudFront invalidation"
  aws cloudfront create-invalidation \
    ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"} \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/*" \
    --query "Invalidation.{Id:Id,Status:Status}" \
    --output table
fi

echo "==> Done"
