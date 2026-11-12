---
title: Publishing Themes
summary: "Learn how to package, distribute, and publish your Beekeeper Studio themes."
icon: material/publish
---

# Publishing Themes

## Publishing Process

### 1. Create a GitHub Repository

Create a public GitHub repository for your theme folder. It should contain at least a `README.md` file.

!!! tip
    Add a screenshot of your theme to the `README.md` so people can see what it looks like before installing it.

### 2. Create a GitHub Release

!!! important "Version Matching"
    Make sure your git tag version matches the version in your `manifest.json` file. For example, if your manifest shows `"version": "1.0.0"`, use tag `v1.0.0`.

Create a **latest** release with a **semver tag** prefixed with "v" (e.g., `v1.0.0`) and **two required assets**:

1. **`manifest.json`** - Your theme manifest file
2. **`{themeId}-{version}.zip`** - ZIP file containing all theme files

For example, a theme with:
- **Theme ID**: `my-first-theme`
- **Version**: `1.0.0` (in manifest.json)
- **Git tag**: `v1.0.0` (must match manifest version)

Your release must include:
- `manifest.json`
- `my-first-theme-1.0.0.zip`

### 3. Submit to Theme Registry

1. **Fork** the registry repository: [beekeeper-studio-plugins](https://github.com/beekeeper-studio/beekeeper-studio-plugins)

2. **Edit `community-themes.json`** and add your theme entry:
   ```diff
   [
     {
       // Other themes...
     },
   + {
   +   "id": "my-first-theme",
   +   "name": "My First Theme",
   +   "author": "Your Name",
   +   "description": "Brief description of your theme",
   +   "repo": "yourusername/my-first-theme"
   + }
   ]
   ```

3. **Create a pull request** with your changes

### 4. Review and Approval

Once you submit your PR:

1. **Review process** - The maintainers will review the request to add your theme to the community registry.
2. **Approval and merge** - After approval, your PR will be merged
3. **Public availability** - Your theme becomes available in Beekeeper Studio's appearance settings

Users can then discover and install your theme directly from within Beekeeper Studio! 🎉
