#!/bin/bash
set -e

# Configuration
R2_BUCKET="your-r2-bucket-name"
R2_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"  # Replace with your R2 endpoint
GPG_KEY_ID="your-gpg-key-id"

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

# Sync existing RPMs and metadata from R2
echo "Syncing existing RPMs and metadata from R2..."
aws s3 sync "s3://$R2_BUCKET/" "$LOCAL_REPO_DIR/" --endpoint-url "$R2_ENDPOINT"

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

    # Sign the RPM with GPG
    echo "Signing the RPM..."
    rpmsign --addsign --key-id "$GPG_KEY_ID" "$LOCAL_REPO_DIR/$RPM_ARCH/$(basename "$RPM_FILE")"
done

# Regenerate repository metadata (shared for all architectures)
echo "Updating RPM repo metadata..."
createrepo_c --update "$LOCAL_REPO_DIR/"

# Sign the repository metadata
echo "Signing repomd.xml..."
gpg --detach-sign --armor --batch --yes --local-user "$GPG_KEY_ID" \
    --output "$LOCAL_REPO_DIR/repodata/repomd.xml.asc" "$LOCAL_REPO_DIR/repodata/repomd.xml"

echo "Generating SHA256 checksum..."
pushd "$LOCAL_REPO_DIR/repodata" > /dev/null
sha256sum repomd.xml > repomd.xml.sha256
popd > /dev/null

# Upload everything back to Cloudflare R2
echo "Uploading updated RPMs and metadata to R2..."
aws s3 sync "$LOCAL_REPO_DIR/" "s3://$R2_BUCKET/" --endpoint-url "$R2_ENDPOINT"

# Clean up
rm -rf "$LOCAL_REPO_DIR"

echo "All RPMs successfully uploaded, signed, and repo metadata updated!"
