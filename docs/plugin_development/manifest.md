---
title: Plugin Manifest Reference
summary: "Complete reference for the manifest.json file that defines your plugin's structure and capabilities."
icon: material/code-json
---

# Plugin Manifest Reference

!!! warning "Beta Feature"
    The plugin system is in beta (available in Beekeeper Studio 5.3+). We'd love your feedback!

The `manifest.json` file defines your plugin's metadata, capabilities, settings, and permissions. This file must be located in the root of your plugin directory.

## Manifest

| Property          | Type                   | Required | Description                                                                                                                |
| ----------------  | ---------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `id`              | `string`               | Yes      | Unique identifier for your plugin. Use lowercase letters, numbers, and hyphens only.                                      |
| `name`            | `string`               | Yes      | Display name shown to users in the Plugin Manager and UI.                                                                 |
| `author`          | `string \| AuthorInfo` | Yes      | Plugin author or organization name.                                                                                        |
| `description`     | `string`               | Yes      | Brief description of what your plugin does.                                                                               |
| `version`         | `string`               | Yes      | Semantic version of your plugin (e.g., "1.0.0", "2.1.5").                                                                |
| `icon`            | `string`               | No       | Material UI icon name. See [Material Icons](https://fonts.google.com/icons?icon.set=Material+Icons) for available options. |
| `capabilities`    | `Capabilities`         | Yes      | Defines what views your plugin provides.                                                                                  |
| `pluginEntryDir`  | `string`               | No       | Path to your plugin's built files relative to the plugin root. Defaults to project root.                                 |
| `manifestVersion` | `1 \| 0`               | No       | Version of the manifest format. Defaults to `0`.                                                                           |
| `minAppVersion`   | `string`               | No       | Minimum Beekeeper Studio version required. If not specified, all version of Beekeeper Studio are supported.                |
| `settings`        | `unknown`              | No       | _(Planned for future releases)_ Configuration options that can be set via config files.                                    |
| `permissions`     | `unknown`              | No       | _(Planned for future releases)_ List of permissions your plugin requires.                                                   |

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
| `"base-tab"`          | Full-tab interface.                                                                    |
| `"primary-sidebar"`   | Primary sidebar panel. _(Planned for future releases)_                                 |
| `"secondary-sidebar"` | Secondary sidebar panel. _(Planned for future releases)_                               |


### Basic Example

```json
{
    "id": "my-database-plugin",
    "name": "Database Analyzer",
    "author": "Your Name",
    "description": "Analyzes database performance and provides optimization suggestions",
    "version": "1.0.0",
    "manifestVersion": 1,
    "minAppVersion": "5.4.0",
    "icon": "analytics",
    "capabilities": {
        "views": [
            {
                "id": "analyzer-tab",
                "name": "Analyzer",
                "type": "shell-tab",
                "entry": "index.html"
            }
        ],
        "menus": [
            {
                "command": "openAnalyzer",
                "name": "Open Analyzer",
                "view": "analyzer-tab",
                "placement": "menubar.tools"
            }
        ]
    }
}
```

## Type Definitions

### AuthorInfo

| Property | Type     | Required | Description                  |
| -------- | -------- | -------- | ---------------------------- |
| `name`   | `string` | Yes      | Author or organization name. |
| `url`    | `string` | Yes      | Author or organization URL.  |

### Capabilities

| Property | Type               | Required | Description                                |
| -------- | ------------------ | -------- | ------------------------------------------ |
| `views`  | `PluginView[]`     | No       | Array of view definitions for your plugin. |
| `menus`  | `PluginMenuItem[]` | No       | Array of menu definitions for your plugin. |

### PluginView

| Property | Type             | Required | Description                                    |
| -------- | ---------------- | -------- | ---------------------------------------------- |
| `id`     | `string`         | Yes      | Unique identifier for this view.               |
| `name`   | `string`         | Yes      | Display name shown in tabs/sidebar.            |
| `type`   | `PluginViewType` | Yes      | Type of view.                                  |
| `entry`  | `string`         | Yes      | Path to the HTML file relative to plugin root. |

### PluginViewType

| Value                 | Description                                                                            |
| --------------------- | -------------------------------------------------------------------------------------- |
| `"plain-tab"`         | Tab with your plugin's iframe taking up the entire tab.                                |
| `"shell-tab"`         | Tab with your plugin's iframe at the top and a collapsible result table at the bottom. |
| `"primary-sidebar"`   | _(Planned for future releases)_ Primary sidebar panel.                                 |
| `"secondary-sidebar"` | _(Planned for future releases)_ Secondary sidebar panel.                               |

### PluginMenuItem

| Property    | Type                      | Required | Description                                                                                                                     |
| ----------- | ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `command`   | `string`                  | Yes      | Command or id of the menu item.                                                                                                 |
| `name`      | `string`                  | Yes      | User-facing label shown in the UI for this menu item.                                                                           |
| `view`      | `string`                  | No       | ID of a view defined in `capabilities.views`; the host opens a new tab of that view.                                            |
| `placement` | `PluginMenuItemPlacement` | No       | Location or locations in the app where this menu item should appear, expressed as a string or array of strings.                 |
| `group`     | `string`                  | No       | _(Planned for future releases)_ Optional group identifier for sorting and grouping items within a placement.                    |
| `order`     | `number`                  | No       | _(Planned for future releases)_ Optional numeric order for fine-grained sorting within a group, with lower numbers shown first. |

### PluginMenuItemPlacement

| Value                               | Description                                       |
| ----------------------------------- | ------------------------------------------------- |
| `"newTabDropdown"`                  | Shown in the dropdown list when opening a new tab |
| `"menubar.tools"`                   | Shown in the tools menu                           |
| `"editor.query.context"`            | Context menu inside the query editor              |
| `"results.cell.context"`            | Context menu on a cell                            |
| `"results.columnHeader.context"`    | Context menu on a row header                      |
| `"results.rowHeader.context"`       | Context menu on a column header                   |
| `"results.corner.context"`          | Context menu on the top left corner               |
| `"tableTable.cell.context"`         | Context menu on a cell                            |
| `"tableTable.columnHeader.context"` | Context menu on a row header                      |
| `"tableTable.rowHeader.context"`    | Context menu on a column header                   |
| `"tableTable.corner.context"`       | Context menu on the top left corner               |
| `"tab.query.header.context"`        | Context menu on the query tab header              |
| `"tab.table.header.context"`        | Context menu on the table tab header              |
| `"entity.table.context"`            | Context menu on a table                           |
| `"entity.schema.context"`           | Context menu on a schema                          |
| `"entity.routine.context"`          | Context menu on a routine                         |

## Legacy Format (Manifest V0)

The old `tabTypes` format looks like this:

```json
{
    "manifestVersion": 0,
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

Please use the new `capabilities` format instead.
