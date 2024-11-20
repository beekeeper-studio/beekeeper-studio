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

# Function to get the next version in sequence
guess_next_version() {
  # Get the most recent tag
  local latest_tag
  latest_tag=$(git ls-remote --tags origin | \
    grep -Eo 'v[0-9]+\.[0-9]+\.[0-9]+(-[a-z]+\.[0-9]+)?$' | \
    sort -V | tail -n 1)

  # Strip 'v' from the tag
  latest_version="${latest_tag#v}"

  if [[ "$latest_version" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)(-(alpha|beta)\.([0-9]+))?$ ]]; then
    major="${BASH_REMATCH[1]}"
    minor="${BASH_REMATCH[2]}"
    patch="${BASH_REMATCH[3]}"
    channel="${BASH_REMATCH[5]:-}"
    channel_num="${BASH_REMATCH[6]:-}"

    if [[ -n "$channel" ]]; then
      # Increment the channel number for pre-releases
      channel_num=$((channel_num + 1))
      echo "$major.$minor.$patch-$channel.$channel_num"
    else
      # Increment the patch version for stable releases
      patch=$((patch + 1))
      echo "$major.$minor.$patch"
    fi
  else
    echo "1.0.0" # Default to this if no valid tags exist
  fi
}

# Function to validate version format
validate_version() {
  if [[ "$1" =~ ^v?([0-9]+\.[0-9]+\.[0-9]+(-[a-z]+\.[0-9]+)?)$ ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    echo "Error: Invalid version format. Expected x.x.x or x.x.x-channel.x"
    exit 1
  fi
}

# Step 1: List recent tags
list_recent_remote_tags

# Step 2: Prompt user for new version with a default guess
default_version=$(guess_next_version)
echo ""
read -p "Enter the new version (default: $default_version): " INPUT_VERSION
VERSION="${INPUT_VERSION:-$default_version}"

# Step 3: Validate and clean the version
VERSION=$(validate_version "$VERSION")
NEW_TAG="v$VERSION"

# Confirm with the user
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
