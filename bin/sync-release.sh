#!/bin/bash

# Function to print usage
print_usage() {
    echo "Usage: $0 <source-repo> <target-repo> <release-tag>"
    echo "Example: $0 user/source-repo user/target-repo v1.0.0"
    exit 1
}

# Check for required arguments
if [ $# -ne 3 ]; then
    print_usage
fi

# Assign arguments to variables
SOURCE_REPO=$1
TARGET_REPO=$2
RELEASE_TAG=$3

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "gh (GitHub CLI) could not be found. Please install it first."
    exit 1
fi

# Fetch the release info from the source repo
echo "Fetching release information for tag $RELEASE_TAG from $SOURCE_REPO..."
RELEASE_JSON=$(gh release view $RELEASE_TAG --repo $SOURCE_REPO --json tagName,body,name)

if [ -z "$RELEASE_JSON" ]; then
    echo "Failed to fetch release information. Please check if the release tag and source repository are correct."
    exit 1
fi

# Extract the release name and body from the JSON response
RELEASE_NAME=$(echo $RELEASE_JSON | jq -r '.name')
RELEASE_BODY=$(echo $RELEASE_JSON | jq -r '.body')

# Create the release in the target repo
echo "Creating release $RELEASE_TAG in $TARGET_REPO..."
gh release create $RELEASE_TAG --repo $TARGET_REPO --title "$RELEASE_NAME" --notes "$RELEASE_BODY"

if [ $? -ne 0 ]; then
    echo "Failed to create release in $TARGET_REPO."
    exit 1
fi

# List assets from the source release
echo "Listing assets for release $RELEASE_TAG in $SOURCE_REPO..."
ASSETS=$(gh release view $RELEASE_TAG --repo $SOURCE_REPO --json assets --jq '.assets[].url')

# Download and upload each asset
for ASSET_URL in $ASSETS; do
    ASSET_NAME=$(basename $ASSET_URL)
    echo "Downloading asset $ASSET_NAME from $SOURCE_REPO..."
    curl -L -o $ASSET_NAME $ASSET_URL

    if [ $? -ne 0 ]; then
        echo "Failed to download asset $ASSET_NAME."
        exit 1
    fi

    echo "Uploading asset $ASSET_NAME to $TARGET_REPO..."
    gh release upload $RELEASE_TAG $ASSET_NAME --repo $TARGET_REPO

    if [ $? -ne 0 ]; then
        echo "Failed to upload asset $ASSET_NAME."
        exit 1
    fi

    # Clean up downloaded asset
    rm $ASSET_NAME
done

echo "Release $RELEASE_TAG successfully copied from $SOURCE_REPO to $TARGET_REPO."
