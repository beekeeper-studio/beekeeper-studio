---
title: Publishing Plugins
summary: "Learn how to package, distribute, and publish your Beekeeper Studio plugins."
icon: material/publish
---

# Publishing Plugins

## Publishing Process

### 1. Create a GitHub Repository

Create a public GitHub repository. It should contain at least a `README.md` file.

### 2. Create a GitHub Release

!!! important "Version Matching"
    Make sure your git tag version matches the version in your `manifest.json` file. For example, if your manifest shows `"version": "1.0.0"`, use tag `v1.0.0`.

#### Using the Starter Template

If you created your project using our [starter template](https://github.com/beekeeper-studio/bks-sample-plugin), you already have a GitHub workflow that automates this process! Simply create and push a semver tag with "v" prefix:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow will automatically:
- Build your plugin
- Create the ZIP file
- Generate a draft release with the required assets

!!! important "Publish the Draft"
    The workflow creates a **draft release**. You still need to go to GitHub, review the draft, and click **"Publish release"** to make it public and mark it as the latest release.

#### Manual Release Process

If you're not using the starter template, create a **latest** release manually with a **semver tag** prefixed with "v" (e.g., `v1.0.0`) and **two required assets**:

1. **`manifest.json`** - Your plugin manifest file
2. **`{pluginId}-{version}.zip`** - ZIP file containing all plugin files

For example, a plugin with:
- **Plugin ID**: `my-awesome-plugin`
- **Version**: `1.0.0` (in manifest.json)
- **Git tag**: `v1.0.0` (must match manifest version)

Your release must include:
- `manifest.json`
- `my-awesome-plugin-1.0.0.zip`

!!! example "Real Example"
    See the [AI Shell repository](https://github.com/beekeeper-studio/bks-ai-shell) for a working example.

### 3. Submit to Plugin Registry

1. **Fork** the registry repository: [beekeeper-studio-plugins](https://github.com/beekeeper-studio/beekeeper-studio-plugins)

2. **Edit `community-plugins.json`** and add your plugin entry:
   ```diff
   [
     {
       // Other plugins...
     },
   + {
   +   "id": "my-awesome-plugin",
   +   "name": "My Awesome Plugin",
   +   "author": "Your Name",
   +   "description": "Brief description of what your plugin does",
   +   "repo": "yourusername/my-awesome-plugin"
   + }
   ]
   ```

3. **Create a pull request** with your changes

### 4. Review and Approval

Once you submit your PR:

1. **Review process** - The maintainers will review the request to add your plugin to the community registry.
2. **Approval and merge** - After approval, your PR will be merged
3. **Public availability** - Your plugin becomes available in the Beekeeper Studio Plugin Manager

Users can then discover and install your plugin directly from within Beekeeper Studio! 🎉

## Helper Scripts

We tend to use this pattern for our projects. A release GitHub workflow paired with a bash script for updating versions and pushing tags. This isn't required, but it simplifies the release process down to running `bin/make-release.sh` from the root of your project and it handles everything else.

### Release Workflow
Here is a `release.yml` workflow that runs on a pushed tag. It assumes that you have a `mise.toml` that looks some thing like this:

```toml
[tools]
node = "24"
pnpm = "12"
npm = "latest"
jq = "1.7"
```

```yaml
name: Create Release

on:
  push:
    tags:
      - "v*"

jobs:
  build-and-release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Node.js, NPM, PNPM, and jq
        uses: jdx/mise-action@v5

      - name: Get project information
        id: project_info
        run: |
          PROJECT_ID=$(jq -r '.id' manifest.json)
          VERSION=$(jq -r '.version' manifest.json)
          # Extract version from tag (removing the 'v' prefix if present)
          TAG_VERSION=${GITHUB_REF#refs/tags/v}
          echo "project_id=$PROJECT_ID" >> $GITHUB_OUTPUT
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          echo "tag_version=$TAG_VERSION" >> $GITHUB_OUTPUT

      - name: Check version match
        run: |
          # Compare the manifest version with the tag version (without 'v' prefix)
          if [ "${{ steps.project_info.outputs.version }}" != "${{ steps.project_info.outputs.tag_version }}" ]; then
            echo "::error::Version mismatch! Tag version v${{ steps.project_info.outputs.tag_version }} doesn't match manifest.json version ${{ steps.project_info.outputs.version }}"
            echo "Please update the version in manifest.json to match your tag or use the correct tag version"
            exit 1
          fi

      - name: Check for existing release
        id: check_release
        run: |
          RELEASE_EXISTS=$(gh release view "v${{ steps.project_info.outputs.version }}" --json id 2>/dev/null || echo "")
          if [ ! -z "$RELEASE_EXISTS" ]; then
            echo "::error::A release with version v${{ steps.project_info.outputs.version }} already exists!"
            echo "Please update the version in manifest.json before creating a new release"
            exit 1
          fi

      - name: Install dependencies
        run: pnpm ci

      - name: Build
        run: pnpm build

      - name: Create zip archive
        id: create_zip
        run: |
          ZIP_NAME="${{ steps.project_info.outputs.project_id }}-${{ steps.project_info.outputs.version }}.zip"
          zip -r "$ZIP_NAME" dist/ manifest.json LICENSE README.md
          echo "zip_name=$ZIP_NAME" >> $GITHUB_OUTPUT

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          draft: true
          name: "Release v${{ steps.project_info.outputs.version }}"
          files: |
            ${{ steps.create_zip.outputs.zip_name }}
            manifest.json
```


### Make-Release Script

This script will check the most recent remote tags and use them to guess the next version. Confirm or change the version to:
1. Update the `manifest.json` and `package.json` with the proper version
2. Commit that change and push
3. Create and push a matching tag for that version

```bash
#!/bin/bash

set -euo pipefail

# Tag format: vMAJOR.MINOR.PATCH with an optional -channel.N pre-release suffix.

# List remote release tags, most recent (by version) first.
# Strips the dereferenced "^{}" entries that git ls-remote emits for annotated tags.
list_remote_tags() {
  git ls-remote --tags origin | \
    sed 's#.*refs/tags/##' | \
    grep -E '^v[0-9]+\.[0-9]+\.[0-9]+(-[a-z]+\.[0-9]+)?$' | \
    sort -V
}

# Function to list the 5 most recent remote tags
list_recent_remote_tags() {
  echo "5 most recent remote tags:"
  list_remote_tags | tail -n 5
}

# Function to get the next version in sequence
guess_next_version() {
  local latest_version
  latest_version=$(list_remote_tags | tail -n 1)

  if [[ "$latest_version" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+)(-(alpha|beta|rc)\.([0-9]+))?$ ]]; then
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

# Function to validate version format (accepts an optional leading "v", strips it)
validate_version() {
  if [[ "$1" =~ ^v?([0-9]+\.[0-9]+\.[0-9]+(-[a-z]+\.[0-9]+)?)$ ]]; then
    echo "${BASH_REMATCH[1]}"
  else
    echo "Error: Invalid version format. Expected x.x.x or x.x.x-channel.x" >&2
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
echo "  - Update manifest.json to version: $VERSION"
echo "  - Push a new git tag: $NEW_TAG"
read -p "Do you want to continue? (y/n): " CONFIRM

if [[ "$CONFIRM" != "y" ]]; then
  echo "Aborted."
  exit 0
fi

# Step 4: Update manifest.json if necessary
MANIFEST_VERSION=$(jq -r '.version' manifest.json)
if [[ "$MANIFEST_VERSION" == "$VERSION" ]]; then
  echo "manifest.json is already updated to version $VERSION."
else
  echo "Updating manifest.json..."
  jq ".version = \"$VERSION\"" manifest.json > manifest.temp.json
  mv manifest.temp.json manifest.json

  git add manifest.json
fi

# Step 5: Update package.json if necessary
PACKAGE_VERSION=$(jq -r '.version' package.json)
if [[ "$PACKAGE_VERSION" == "$VERSION" ]]; then
  echo "package.json is already updated to version $VERSION."
else
  echo "Updating package.json..."
  jq ".version = \"$VERSION\"" package.json > package.temp.json
  mv package.temp.json package.json

  git add package.json
fi

if [[ "$MANIFEST_VERSION" != "$VERSION" || "$PACKAGE_VERSION" != "$VERSION" ]]; then
  # Commit changes
  echo "Committing changes..."
  git commit -m "chore: bump version to $VERSION"
  git push
end

# Step 6: Push tag
if git ls-remote --tags origin "refs/tags/$NEW_TAG" | grep -q "$NEW_TAG"; then
  echo "Tag $NEW_TAG already exists on origin."
else
  echo "Creating and pushing tag $NEW_TAG..."
  git tag "$NEW_TAG"
  git push origin "$NEW_TAG"
fi

echo "Release process completed successfully."
```
