#! /bin/bash

set -euxo pipefail


# Fetch the latest release data from GitHub API for beekeeper-studio/beekeeper-studio
response=$(curl -s https://api.github.com/repos/beekeeper-studio/beekeeper-studio/releases/latest)

# Use grep and cut to parse the tag name from the response
LATEST_RELEASE=$(echo "$response" | grep '"tag_name":' | head -1 | cut -d '"' -f 4)

# Check if the tag name is empty
if [ -z "$LATEST_RELEASE" ]; then
    echo "Failed to fetch the latest release tag name."
else
    echo "The latest release tag name is: $LATEST_RELEASE"
fi


TAG="$LATEST_RELEASE"


git log --merges --first-parent master "$TAG..HEAD" --oneline
