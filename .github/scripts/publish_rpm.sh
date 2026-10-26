#!/bin/bash
# Publish RPM package(s) to the R2-hosted yum repository.
#
# Three stages:
#   1. sync the existing repo metadata DOWN from R2 (metadata only, not packages)
#   2. prepare the repo locally -- sign + regenerate metadata (prepare_rpm_repo.sh)
#   3. sync the new packages and updated metadata UP to R2
#
# The back catalogue of packages (many GB and growing) stays in R2 and is never
# downloaded onto the runner; only the metadata makes the round trip.
set -euxo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure required commands are installed
for cmd in aws createrepo_c gpg rpmsign rpm; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "Error: $cmd is not installed. Please install it first."
        exit 1
    fi
done

# Check if at least one RPM file is provided
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 path/to/packages/*.rpm"
    exit 1
fi

# Create a dynamic temporary directory for this run
LOCAL_REPO_DIR=$(mktemp -d -t rpm-repo-XXXXXX)
trap 'rm -rf "$LOCAL_REPO_DIR"' EXIT

# 1. Sync ONLY the existing repo metadata from R2 -- NOT the packages themselves.
echo "Syncing existing repo metadata from R2..."
aws s3 sync "s3://$R2_BUCKET/repodata/" "$LOCAL_REPO_DIR/repodata/" --endpoint-url "$R2_ENDPOINT"

# 2. Sign the new packages and regenerate the repo metadata locally.
"$SCRIPT_DIR/prepare_rpm_repo.sh" "$LOCAL_REPO_DIR" "$@"

# 3. Upload the new packages (existing ones already live in R2, untouched). Only
#    the architecture dirs that received a new package exist locally, so this
#    uploads just those.
for ARCH_DIR in "$LOCAL_REPO_DIR"/*/; do
    ARCH=$(basename "$ARCH_DIR")
    [ "$ARCH" = "repodata" ] && continue
    echo "Uploading new $ARCH packages to R2..."
    aws s3 sync "$ARCH_DIR" "s3://$R2_BUCKET/$ARCH/" --endpoint-url "$R2_ENDPOINT"
done

# Upload the regenerated metadata. --delete removes stale metadata files that the
# new repomd.xml no longer references (safe: repodata only holds generated files).
echo "Uploading updated repo metadata to R2..."
aws s3 sync "$LOCAL_REPO_DIR/repodata/" "s3://$R2_BUCKET/repodata/" --endpoint-url "$R2_ENDPOINT" --delete

echo "All RPMs successfully uploaded, signed, and repo metadata updated!"
