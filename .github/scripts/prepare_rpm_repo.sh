#!/bin/bash
# Prepare a signed RPM repository in a local directory.
#
# Pure local operation -- no network, no S3. Given a repo directory that already
# holds the existing repodata/ metadata (empty or absent on the first ever run)
# plus a list of new RPM files, this signs the new packages, drops them into
# their per-architecture subdirectories, and regenerates the repo metadata so it
# lists both the new packages and every previously published package.
#
# Existing packages are carried forward from the old metadata via
# --recycle-pkglist, so their .rpm files do NOT need to be present on disk. That
# is what lets the caller avoid downloading the (many GB and growing) back
# catalogue of packages on every release.
#
# Usage: prepare_rpm_repo.sh <REPO_DIR> path/to/pkg1.rpm [path/to/pkg2.rpm ...]
# Env:   GPG_KEY_ID  GPG key id used to sign the packages and the metadata
set -euxo pipefail

# Ensure required commands are installed
for cmd in createrepo_c gpg rpmsign rpm; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "Error: $cmd is not installed. Please install it first."
        exit 1
    fi
done

if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <REPO_DIR> path/to/packages/*.rpm"
    exit 1
fi

REPO_DIR="$1"
shift

mkdir -p "$REPO_DIR/repodata"

# List of the NEW packages published in this run. The already-published packages
# are picked up automatically from the existing metadata by --recycle-pkglist, so
# they never need to be listed (or present on disk) here.
PKGLIST=$(mktemp -t rpm-pkglist-XXXXXX)
trap 'rm -f "$PKGLIST"' EXIT

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
    mkdir -p "$REPO_DIR/$RPM_ARCH"

    RPM_BASENAME=$(basename "$RPM_FILE")

    # Copy the RPM into the local repo
    echo "Copying $RPM_FILE to repo..."
    cp "$RPM_FILE" "$REPO_DIR/$RPM_ARCH/"

    # Sign the RPM with GPG
    echo "Signing the RPM..."
    rpmsign --addsign --key-id "$GPG_KEY_ID" "$REPO_DIR/$RPM_ARCH/$RPM_BASENAME"

    # Add the new package to the metadata pkglist (path is relative to the repo root)
    echo "$RPM_ARCH/$RPM_BASENAME" >> "$PKGLIST"
done

# Regenerate repository metadata (shared for all architectures).
#
# --update           reuses the existing metadata for unchanged packages, so
#                    their .rpm files do not need to be re-read (or downloaded).
# --recycle-pkglist  carries every already-published package forward from the old
#                    metadata, so nothing is dropped just because its file is not
#                    present locally.
# --pkglist          adds the new packages published in this run (unioned with the
#                    recycled list above).
# --skip-stat        stops createrepo_c from stat()-ing the (absent) existing
#                    package files during the cache lookup.
echo "Updating RPM repo metadata..."
createrepo_c --update --skip-stat --recycle-pkglist --pkglist "$PKGLIST" "$REPO_DIR/"

# Sign the repository metadata
echo "Signing repomd.xml..."
gpg --detach-sign --armor --batch --yes --local-user "$GPG_KEY_ID" \
    --output "$REPO_DIR/repodata/repomd.xml.asc" "$REPO_DIR/repodata/repomd.xml"

echo "Generating SHA256 checksum..."
pushd "$REPO_DIR/repodata" > /dev/null
sha256sum repomd.xml > repomd.xml.sha256
popd > /dev/null

echo "Repo prepared at $REPO_DIR"
