---
title: Publishing Plugins
summary: "Learn how to package, distribute, and publish your Beekeeper Studio plugins."
icon: material/publish
---

# Publishing Plugins

!!! warning "Beta Feature"
    The plugin system is in beta (available in Beekeeper Studio 5.3+). Things might change, but we'd love your feedback!

## Publishing Process

### 1. Create a GitHub Repository

Create a public GitHub repository. It should contain at least a `README.md` file.

### 2. Create a GitHub Release

!!! important "Version Matching"
    Make sure your git tag version matches the version in your `manifest.json` file. For example, if your manifest shows `"version": "1.0.0"`, use tag `v1.0.0`.

#### Using the Starter Template

If you created your project using our starter template, you already have a GitHub workflow that automates this process! Simply create and push a semver tag with "v" prefix:

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

2. **Edit `plugins.json`** and add your plugin entry:
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

1. **Review process** - The maintainers will review your plugin for quality and security
2. **Approval and merge** - After approval, your PR will be merged
3. **Public availability** - Your plugin becomes available in the Beekeeper Studio Plugin Manager

Users can then discover and install your plugin directly from within Beekeeper Studio! 🎉
