---
title: Publishing Plugins
summary: "Learn how to package, distribute, and publish your Beekeeper Studio plugins."
icon: material/publish
---

# Publishing Plugins

!!! warning "Beta Feature"
    The plugin system is currently in beta. APIs and functionality may change in future releases. Please provide feedback and report issues to help us improve the system.

## Publishing Process

### 1. Create a GitHub Repository

Create a public GitHub repository. It should contain at least a `README.md` file.

### 2. Create a GitHub Release

Create a **latest** release with **two required assets**:

1. **`manifest.json`** - Your plugin manifest file
2. **`{pluginId}-{version}.zip`** - ZIP file containing all plugin files

#### Example:
For a plugin with:
- **Plugin ID**: `my-awesome-plugin`
- **Version**: `1.0.0`

Your release must include:
- `manifest.json`
- `my-awesome-plugin-1.0.0.zip`

!!! example "Real Example"
    See the [bks-ai-shell repository](https://github.com/beekeeper-studio/bks-ai-shell) for a working example.

### 3. Submit to Plugin Registry

1. **Fork** the registry repository:
   `https://github.com/beekeeper-studio/beekeeper-studio-plugins`

2. **Edit `plugins.json`** and add your plugin:
   ```json
   [
     {
       "id": "my-awesome-plugin",
       "name": "My Awesome Plugin",
       "author": "Your Name",
       "description": "Brief description of what your plugin does",
       "repo": "yourusername/my-awesome-plugin"
     }
   ]
   ```

3. **Create a pull request**

### 4. Wait for Approval

Once your PR is approved and merged, your plugin will be available in the Beekeeper Studio Plugin Manager for public installation.
