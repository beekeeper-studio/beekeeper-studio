#!/bin/bash

set -euxo pipefail

# If a tag is passed as the first argument, use it
if [[ -n "${1-}" ]]; then
    TAG="$1"
    echo "Using provided tag: $TAG"
else
    # Fetch all tags from GitHub API
    tags=$(curl -s https://api.github.com/repos/beekeeper-studio/beekeeper-studio/tags | jq -r '.[].name')

    # Filter only valid semver tags (excluding beta/alpha), allowing for 'v' prefix
    valid_tags=$(echo "$tags" | grep -E '^v?[0-9]+\.[0-9]+\.[0-9]+$' | grep -vE 'beta|alpha' | sort -Vr | head -n 9)

    # Check if we found enough tags
    if [ -z "$valid_tags" ]; then
        echo "No valid release tags found."
        exit 1
    fi

    # Prompt the user to choose a tag
    echo "Select a tag to use:"
    select TAG in $valid_tags; do
        if [ -n "$TAG" ]; then
            break
        fi
        echo "Invalid selection. Please try again."
    done
fi

echo "Using tag: $TAG"

# Run git log command with the selected tag
git log --merges --first-parent master "$TAG..HEAD" --oneline
