#!/bin/bash
set -euo pipefail

# Mirror a published GitHub release into the downloads R2 bucket, and refresh
# the latest.json manifest the website resolves downloads from.
#
# Ordering matters: binaries upload first, the manifest last, so latest.json
# never references an object that isn't in the bucket yet. Uploads overwrite,
# so re-running (via workflow_dispatch) is safe and heals partial runs.
#
# Required env:
#   GH_TOKEN         - GitHub token for release reads
#   R2_BUCKET        - target bucket name
#   R2_ENDPOINT      - S3-compatible endpoint URL
#   PUBLIC_BASE_URL  - public origin serving the bucket (custom domain)
#   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY - R2 credentials

TAG="${1:?usage: mirror_release_downloads.sh <tag>}"
REPO="beekeeper-studio/beekeeper-studio"
PREFIX="releases/$TAG"

INFO=$(gh release view "$TAG" --repo "$REPO" --json tagName,publishedAt,isDraft,isPrerelease,assets)

if [ "$(jq -r '.isDraft' <<<"$INFO")" = "true" ]; then
  echo "$TAG is a draft; nothing to mirror."
  exit 0
fi

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

echo "Downloading $(jq '.assets | length' <<<"$INFO") assets for $TAG"
gh release download "$TAG" --repo "$REPO" --dir "$WORKDIR"

while IFS=$'\t' read -r name ctype; do
  aws s3 cp "$WORKDIR/$name" "s3://$R2_BUCKET/$PREFIX/$name" \
    --endpoint-url "$R2_ENDPOINT" \
    --content-type "$ctype" \
    --cache-control "public, max-age=31536000, immutable" \
    < /dev/null
done < <(jq -r '.assets[] | [.name, .contentType] | @tsv' <<<"$INFO")

# Only the release GitHub reports as latest may write the manifest. This one
# rule covers prereleases, re-published old versions, and near-simultaneous
# publishes: drafts and prereleases are never "latest", and whatever order
# concurrent runs finish in, the manifest converges on the canonical latest.
LATEST_TAG=$(gh api "repos/$REPO/releases/latest" --jq '.tag_name')
if [ "$LATEST_TAG" != "$TAG" ]; then
  echo "$TAG is not the latest release ($LATEST_TAG is): assets mirrored, latest.json untouched."
  exit 0
fi

# extension/arch/type must stay in lockstep with the website's matching logic
# (web repo: _assets/js/lib/github.js GithubAsset + controllers/download.js).
# electron-updater metadata (*.yml, *.blockmap) is mirrored above but excluded
# from the manifest - it is not a user-facing download.
jq --arg base "$PUBLIC_BASE_URL/$PREFIX" '
  {
    tag_name: .tagName,
    version: (.tagName | ltrimstr("v")),
    published_at: .publishedAt,
    assets: [
      .assets[]
      | select((.name | test("\\.(yml|blockmap)$")) | not)
      | {
          name,
          size,
          content_type: .contentType,
          extension: (.name | split(".") | last),
          arch: (.name
            | if test("arm64|aarch64") then "arm64"
              elif test("armhf") then "armhf"
              elif test("armv7l") then "armv7l"
              else "x86_64" end),
          type: (if (.name | endswith(".exe")) and (.name | test("portable")) then "portable" else "installer" end),
          url: ($base + "/" + (.name | @uri))
        }
    ]
  }' <<<"$INFO" > "$WORKDIR/latest.json"

aws s3 cp "$WORKDIR/latest.json" "s3://$R2_BUCKET/latest.json" \
  --endpoint-url "$R2_ENDPOINT" \
  --content-type "application/json" \
  --cache-control "public, max-age=60"

echo "Mirrored $TAG to $PREFIX and updated latest.json"
