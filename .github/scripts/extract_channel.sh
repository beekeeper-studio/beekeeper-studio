#!/bin/bash

set -e

# Ensure jq is installed
if ! command -v jq &> /dev/null
then
    echo "jq could not be found. Please install it to proceed."
    exit 1
fi

# Extract version from package.json
VERSION=$(jq -r '.version' apps/studio/package.json)

# Determine the release channel based on the version
if [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    CHANNEL="latest"
elif [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+-beta(\.[0-9]+)*$ ]]; then
    CHANNEL="beta"
elif [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+-alpha(\.[0-9]+)*$ ]]; then
    CHANNEL="alpha"
else
    echo "Version format not recognized: $VERSION"
    exit 1
fi

# Determine deb_codename
if [[ "$CHANNEL" == "latest" ]]; then
    DEB_CODENAME="stable"
else
    DEB_CODENAME="$CHANNEL"
fi

# Output the results to $GITHUB_OUTPUT
echo "channel=$CHANNEL" >> $GITHUB_OUTPUT
echo "deb_codename=$DEB_CODENAME" >> $GITHUB_OUTPUT

# Print the results
echo "Version: $VERSION"
echo "-> channel: $CHANNEL"
echo "-> deb_codename: $DEB_CODENAME"
