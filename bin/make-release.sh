#!/bin/bash

set -euo pipefail

# Function to list the 5 most recent remote tags by date
list_recent_remote_tags() {
  echo "Fetching the 5 most recent remote tags by date:"
  git ls-remote --tags origin | \
    grep -E 'refs/tags/v[0-9]+\.[0-9]+\.[0-9]+(-[a-z]+\.[0-9]+)?$' | \
    while read -r hash ref; do
      tag="${ref#refs/tags/}"
      date=$(git log -1 --format='%ci' "$hash" 2>/dev/null || echo "unknown date")
      echo "$tag $date"
    done | sort -k2 -r | head -n 5
}

# Function to validate version format
validate_version() {
  if [[ "$1" =~ ^([0-9]+\.[0-9]+\.[0-9]+)(-(alpha|beta)\.[0-9]+)?$ ]]; then
    echo "Valid version: $1"
  else
    echo "Error: Invalid version format. Expected x.x.x or x.x.x-channel.x"
    exit 1
  fi
}

# Step 1: List recent tags
list_recent_remote_tags

# Step 2: Prompt user for new version
echo ""
read -p "Enter the new version (e.g., 5.0.0 or 5.0.0-beta.5): " VERSION

# Validate the version
validate_version "$VERSION"

# Step 3: Confirm with user
NEW_TAG="v$VERSION"
echo ""
echo "This will:"
echo "  - Update apps/studio/package.json to version: $VERSION"
echo "  - Push a new git tag: $NEW_TAG"
read -p "Do you want to continue? (y/n): " CONFIRM

if [[ "$CONFIRM" != "y" ]]; then
  echo "Aborted."
  exit 0
fi

# Step 4: Update package.json if necessary
PACKAGE_VERSION=$(jq -r '.version' apps/studio/package.json)
if [[ "$PACKAGE_VERSION" == "$VERSION" ]]; then
  echo "package.json is already updated to version $VERSION."
else
  echo "Updating apps/studio/package.json..."
  jq ".version = \"$VERSION\"" apps/studio/package.json > apps/studio/package.temp.json
  mv apps/studio/package.temp.json apps/studio/package.json

  # Commit changes
  echo "Committing changes..."
  git add apps/studio/package.json
  git commit -m "chore: bump version to $VERSION"
  git push
fi

# Step 5: Push tag
if git tag | grep -q "$NEW_TAG"; then
  echo "Tag $NEW_TAG already exists."
else
  echo "Creating and pushing tag $NEW_TAG..."
  git tag "$NEW_TAG"
  git push origin "$NEW_TAG"
fi

echo "Release process completed successfully."
