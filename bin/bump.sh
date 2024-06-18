#!/bin/bash

set -euxo pipefail

# Add and commit all files
git add .
git commit -m "bump"

# Get the current version from package.json
current_version=$(jq -r '.version' apps/studio/package.json)

# Split the version into an array
IFS='.' read -r -a version_parts <<< "$current_version"

# Increment the patch version
((version_parts[2]++))

# Join the version parts back into a version string
new_version="${version_parts[0]}.${version_parts[1]}.${version_parts[2]}"

# Update the version in package.json
jq --arg new_version "$new_version" '.version = $new_version' apps/studio/package.json > tmp.json && mv tmp.json apps/studio/package.json

# Commit the updated package.json
git add apps/studio/package.json
git commit -m "bump version to $new_version"

# Create a git tag with the new version
git tag "v$new_version"

echo "Bumping remote to $new_version, pushing tag in 3..."
sleep 3


# Push the commit and the tag
git push
git push origin "v$new_version"
