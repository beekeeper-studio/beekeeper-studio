---
title: Plugin Manifest Reference
summary: "Complete reference for the manifest.json file that defines your plugin's structure and capabilities."
icon: material/code-json
---

# Plugin Manifest Reference

!!! warning "Beta Feature"
    The plugin system is in beta (available in Beekeeper Studio 5.3+). Things might change, but we'd love your feedback!

The `manifest.json` file defines your plugin's metadata, capabilities, settings, and permissions. This file must be located in the root of your plugin directory.

## Manifest

| Property         | Type                   | Required | Description                                                                                                                |
| ---------------- | ---------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `id`             | `string`               | Yes      | Unique identifier for your plugin. Use lowercase letters, numbers, and hyphens only.                                      |
| `name`           | `string`               | Yes      | Display name shown to users in the Plugin Manager and UI.                                                                 |
| `author`         | `string \| AuthorInfo` | Yes      | Plugin author or organization name.                                                                                        |
| `description`    | `string`               | Yes      | Brief description of what your plugin does.                                                                               |
| `version`        | `string`               | Yes      | Semantic version of your plugin (e.g., "1.0.0", "2.1.5").                                                                |
| `icon`           | `string`               | No       | Material UI icon name. See [Material Icons](https://fonts.google.com/icons?icon.set=Material+Icons) for available options. |
| `capabilities`   | `Capabilities`         | Yes      | Defines what views your plugin provides.                                                                                  |
| `pluginEntryDir` | `string`               | No       | Path to your plugin's built files relative to the plugin root. Defaults to project root.                                 |

<details>
<summary>Not Yet Implemented Manifest</summary>
<table>
    <thead>
        <tr>
            <th>Property</th>
            <th>Type</th>
            <th>Required</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><code>minAppVersion</code></td>
            <td><code>string</code></td>
            <td>No</td>
            <td>Minimum Beekeeper Studio version required.</td>
        </tr>
        <tr>
            <td><code>settings</code></td>
            <td><code>Setting[]</code></td>
            <td>No</td>
            <td>Configuration options that can be set via config files.</td>
        </tr>
        <tr>
            <td><code>permissions</code></td>
            <td><code>Permission[]</code></td>
            <td>No</td>
            <td>List of permissions your plugin requires.</td>
        </tr>
    </tbody>
</table>
</details>

## AuthorInfo

| Property | Type     | Required | Description                   |
| -------- | -------- | -------- | ----------------------------- |
| `name`   | `string` | Yes      | Author or organization name.  |
| `url`    | `string` | Yes      | Author or organization URL.   |

## Capabilities

| Property | Type     | Required | Description                               |
| -------- | -------- | -------- | ----------------------------------------- |
| `views`  | `View[]` | Yes      | Array of view definitions for your plugin. |

## View

| Property | Type       | Required | Description                                       |
| -------- | ---------- | -------- | ------------------------------------------------- |
| `id`     | `string`   | Yes      | Unique identifier for this view.                  |
| `name`   | `string`   | Yes      | Display name shown in tabs/sidebar.              |
| `type`   | `ViewType` | Yes      | Type of view.                                     |
| `entry`  | `string`   | Yes      | Path to the HTML file relative to plugin root.   |

## ViewType

| Value                 | Description                                                                            |
| --------------------- | -------------------------------------------------------------------------------------- |
| `"shell-tab"`         | Tab with your plugin's iframe at the top and a collapsible result table at the bottom. |
| `"plain-tab"`         | Full-tab interface. _(Planned for future releases)_                                    |
| `"primary-sidebar"`   | Primary sidebar panel. _(Planned for future releases)_                                 |
| `"secondary-sidebar"` | Secondary sidebar panel. _(Planned for future releases)_                               |


## Basic Example

```json
{
    "id": "my-database-plugin",
    "name": "Database Analyzer",
    "author": "Your Name",
    "description": "Analyzes database performance and provides optimization suggestions",
    "version": "1.0.0",
    "icon": "analytics",
    "capabilities": {
        "views": [
            {
                "id": "analyzer-tab",
                "name": "Analyzer",
                "type": "shell-tab",
                "entry": "index.html"
            }
        ]
    }
}
```

### Legacy Format (Deprecated)

For backward compatibility, the old `tabTypes` format is still supported:

```json
{
    "capabilities": {
        "views": {
            "tabTypes": [
                {
                    "id": "data-visualizer",
                    "name": "Data Visualizer",
                    "kind": "shell",
                    "entry": "tab.html"
                }
            ]
        }
    }
}
```
