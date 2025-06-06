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

Create a public GitHub repository with your plugin files:

```
my-plugin/
├── manifest.json        # Required: Plugin metadata
├── index.html          # Required: Main entry point
├── README.md           # Recommended: Documentation
└── assets/             # Optional: Images, etc.
```

### 2. Create a GitHub Release

Create a release with **two required assets**:

#### Release Assets Required:
1. **`manifest.json`** - Your plugin manifest file
2. **`{pluginId}-{version}.zip`** - ZIP file containing all plugin files

#### Example:
For a plugin with:
- **Plugin ID**: `my-awesome-plugin`
- **Version**: `1.0.0`

Your release must include:
- `manifest.json`
- `my-awesome-plugin-1.0.0.zip`

#### Steps:
1. Go to your repository → **Releases** → **Create a new release**
2. Create a tag: `v1.0.0`
3. Release title: `Release v1.0.0`
4. Create a ZIP file named `{pluginId}-{version}.zip` containing all your plugin files
5. Upload both `manifest.json` and the ZIP file as release assets
6. **Mark the release as "Latest"**

!!! example "Real Example"
    See the [bks-ai-shell repository](https://github.com/beekeeper-studio/bks-ai-shell) for a working example. Their v1.0.14 release includes:
    - `manifest.json`
    - `bks-ai-shell-1.0.14.zip`

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

3. **Create a pull request** with title: `Add My Awesome Plugin`

### 4. Wait for Approval

Once your PR is approved and merged, your plugin will be available in the Beekeeper Studio Plugin Manager for public installation.

## Requirements

- **Public GitHub repository**
- **Latest release** with proper asset naming
- **Valid manifest.json**
- **Working plugin** that follows the plugin guidelines

## Getting Help

- **Registry issues**: Comment on your PR in the registry repository
- **Plugin development**: Check the [Plugin API Reference](api-reference.md)
- **General questions**: Join the Beekeeper Studio community discussions
