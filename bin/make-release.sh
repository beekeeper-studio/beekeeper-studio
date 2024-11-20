#!/bin/bash

set -euo pipefail

# Function to list the 5 most recent tags
list_recent_tags() {
  echo "Fetching the 5 most recent remote tags by date:"
git ls-remote --tags origin | \
  awk '{print $2}' | \
  grep -Eo 'v[0-9]+\.[0-9]+\.[0-9]+(-[a-z]+\.[0-9]+)?$' | \
  sort -V | tail -n 5
}

# Function to validate version format
validate_version() {
  if [[ "$1" =~ ^([0-9]+\.[0-9]+\.[0-9]+)(-(alpha|beta)\.[0-9]+)?$ ]]; then
    FULL_VERSION="${BASH_REMATCH[0]}"     # The full version string
    MAIN_VERSION="${BASH_REMATCH[1]}"    # The main version (e.g., 5.0.0)
    CHANNEL="${BASH_REMATCH[3]:-stable}" # Channel (alpha, beta, or stable)

    echo "Full Version: $FULL_VERSION"
    echo "Main Version: $MAIN_VERSION"
    echo "Channel: $CHANNEL"
  else
    echo "Error: Invalid version format. Expected x.x.x or x.x.x-channel.x"
    exit 1
  fi
}
# Step 1: List recent tags
list_recent_tags

# Step 2: Prompt user for new version
echo ""
read -p "Enter the new version (format: x.x.x): " VERSION

# Ensure version does not start with 'v'
if [[ "$VERSION" =~ ^v ]]; then
  echo "Error: Version should not start with 'v'"
  exit 1
fi

# Validate version format
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

# Step 4: Update package.json
echo "Updating apps/studio/package.json..."
jq ".version = \"$VERSION\"" apps/studio/package.json > apps/studio/package.temp.json
mv apps/studio/package.temp.json apps/studio/package.json

# Commit changes
echo "Committing changes..."
git add apps/studio/package.json
git commit -m "chore: bump version to $VERSION"

# Push commit
echo "Pushing commit..."
git push

# Create and push tag
echo "Creating and pushing tag $NEW_TAG..."
git tag "$NEW_TAG"
git push origin "$NEW_TAG"

echo "Release process completed successfully."
