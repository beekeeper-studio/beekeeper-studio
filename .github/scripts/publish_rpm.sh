#!/bin/bash
set -euxo pipefail

# Ensure required commands are installed
for cmd in aws createrepo_c gpg rpmsign rpm; do
    if ! command -v $cmd &> /dev/null; then
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

# Sync ONLY the existing repo metadata from R2 -- NOT the packages themselves.
#
# The repo keeps every published RPM, so the full bucket is many GB and climbing.
# Downloading all of it exhausts the runner's disk and wastes bandwidth on every
# release. createrepo_c only needs the packages that actually changed to be
# present on disk; existing packages are carried forward from their cached
# metadata (see the --pkglist/--skip-stat below).
echo "Syncing existing repo metadata from R2..."
aws s3 sync "s3://$R2_BUCKET/repodata/" "$LOCAL_REPO_DIR/repodata/" --endpoint-url "$R2_ENDPOINT"

# Build the list of packages the new metadata should contain. Start from the
# packages already recorded in the existing metadata (their files stay in R2,
# untouched), then append the new packages we are publishing in this run.
PKGLIST="$LOCAL_REPO_DIR/pkglist.txt"
: > "$PKGLIST"
EXISTING_PRIMARY=$(find "$LOCAL_REPO_DIR/repodata" -name '*primary.xml.gz' | head -n 1 || true)
if [ -n "$EXISTING_PRIMARY" ]; then
    echo "Carrying forward existing packages from metadata..."
    zcat "$EXISTING_PRIMARY" | grep -o '<location href="[^"]*"' \
        | sed 's/<location href="//; s/"$//' >> "$PKGLIST"
fi

# Track which architecture directories received new packages so we can upload
# just those back to R2.
UPLOAD_ARCHES=()

# Process each RPM file
for RPM_FILE in "$@"; do
    if [ ! -f "$RPM_FILE" ]; then
        echo "Skipping invalid RPM: $RPM_FILE"
        continue
    fi

    echo "Processing RPM: $RPM_FILE"

    # Extract RPM architecture
    RPM_ARCH=$(rpm -qp --queryformat "%{ARCH}" "$RPM_FILE")

    echo "Detected architecture: $RPM_ARCH"

    # Ensure architecture subdirectory exists
    mkdir -p "$LOCAL_REPO_DIR/$RPM_ARCH"

    # Copy the RPM into the local repo
    echo "Copying $RPM_FILE to repo..."
    cp "$RPM_FILE" "$LOCAL_REPO_DIR/$RPM_ARCH/"

    RPM_BASENAME=$(basename "$RPM_FILE")

    # Sign the RPM with GPG
    echo "Signing the RPM..."
    rpmsign --addsign --key-id "$GPG_KEY_ID" "$LOCAL_REPO_DIR/$RPM_ARCH/$RPM_BASENAME"

    # Add the new package to the metadata pkglist (path is relative to the repo root)
    echo "$RPM_ARCH/$RPM_BASENAME" >> "$PKGLIST"
    UPLOAD_ARCHES+=("$RPM_ARCH")
done

# Regenerate repository metadata (shared for all architectures).
#
# --pkglist    limits the metadata to exactly the packages we listed (existing +
#              new); nothing gets silently dropped just because its file is not
#              present locally.
# --update     reuses the cached metadata for unchanged packages, so their .rpm
#              files do not need to be re-read (or even downloaded).
# --skip-stat  stops createrepo_c from stat()-ing the (absent) existing package
#              files during the cache lookup.
echo "Updating RPM repo metadata..."
createrepo_c --update --skip-stat --pkglist "$PKGLIST" "$LOCAL_REPO_DIR/"

# Sign the repository metadata
echo "Signing repomd.xml..."
gpg --detach-sign --armor --batch --yes --local-user "$GPG_KEY_ID" \
    --output "$LOCAL_REPO_DIR/repodata/repomd.xml.asc" "$LOCAL_REPO_DIR/repodata/repomd.xml"

echo "Generating SHA256 checksum..."
pushd "$LOCAL_REPO_DIR/repodata" > /dev/null
sha256sum repomd.xml > repomd.xml.sha256
popd > /dev/null

# Upload the new packages to R2 (existing packages are already there, untouched).
for RPM_ARCH in $(printf '%s\n' "${UPLOAD_ARCHES[@]+"${UPLOAD_ARCHES[@]}"}" | sort -u); do
    echo "Uploading new $RPM_ARCH packages to R2..."
    aws s3 sync "$LOCAL_REPO_DIR/$RPM_ARCH/" "s3://$R2_BUCKET/$RPM_ARCH/" --endpoint-url "$R2_ENDPOINT"
done

# Upload the regenerated metadata. --delete removes stale metadata files that the
# new repomd.xml no longer references (safe: repodata only holds generated files).
echo "Uploading updated repo metadata to R2..."
aws s3 sync "$LOCAL_REPO_DIR/repodata/" "s3://$R2_BUCKET/repodata/" --endpoint-url "$R2_ENDPOINT" --delete

# Clean up
rm -rf "$LOCAL_REPO_DIR"

echo "All RPMs successfully uploaded, signed, and repo metadata updated!"
