---
title: Capabilities
summary: "Every place in Beekeeper Studio where a plugin can add a menu item or button, with a manifest example for each."
icon: material/menu-open
---

# Capabilities

A plugin's capabilities are declared in the `capabilities` section of its [manifest](manifest.md#capabilities):

- `views` are the [views](plugin-views.md) your plugin provides, such as a tab.
- `menu` is the menu items and buttons that open those views, and where they appear in Beekeeper Studio.

This page lists every place a menu item can appear. Picking the item opens one of your plugin's views in a new tab, and the view can read where it was opened from with [`getViewContext()`](api-reference.md#getviewcontext).

Menu items are declared in the `capabilities.menu` array:

```json
{
  "capabilities": {
    "views": [
      { "id": "overview", "name": "Table Overview", "type": "base-tab", "entry": "index.html" }
    ],
    "menu": [
      {
        "command": "profile-table",
        "name": "Profile Table",
        "view": "overview",
        "placement": ["entity.table.context", "tab.table.header.context"],
        "icon": "query_stats"
      }
    ]
  }
}
```

- `command` identifies the item. It must be unique within a placement.
- `name` is the label users see.
- `view` is the id of the view to open.
- `placement` is where the item appears: one placement, or an array of them to show the same item in several places.
- `icon` is a [Material icon](https://fonts.google.com/icons?icon.set=Material+Icons) name. It falls back to the manifest's `icon`.

See [PluginMenuItem](manifest.md#pluginmenuitem) for every field, including `enabledWhen`.

In context menus, items from all plugins share one **Plugins** section at the bottom of the menu. Plugins are sorted by name, each plugin's items keep their manifest order, and the section ends with **Manage Plugins…**.

!!! note "Beekeeper Studio 6.2"
    `editor.query.toolbar`, `results.statusbar`, `tableTable.statusbar`, `tab.query.header.context` and `tab.table.header.context` need Beekeeper Studio 6.2 or later. Earlier versions skip items with a placement they don't know. Set `"minAppVersion": "6.2.0"` in your manifest if your plugin depends on them.

## All Menu Placements

| Placement | Where it appears | View params |
| --------- | ---------------- | ----------- |
| [`newTabDropdown`](#new-tab-dropdown) | Dropdown next to the new tab button | None |
| [`menubar.tools`](#tools-menu) | **Tools** menu | None |
| [`editor.query.context`](#query-editor-context-menu) | Query editor context menu | [`EditorMenuParams`](api-reference.md#editormenuparams) |
| [`editor.query.toolbar`](#query-editor-toolbar) | Query editor toolbar, next to **Run** | [`EditorMenuParams`](api-reference.md#editormenuparams) |
| [`results.cell.context`](#query-results-cell) | Query results: cell context menu | [`CellMenuParams`](api-reference.md#cellmenuparams) |
| [`results.columnHeader.context`](#query-results-column-header) | Query results: column header context menu | [`ColumnMenuParams`](api-reference.md#columnmenuparams) |
| [`results.rowHeader.context`](#query-results-row-header) | Query results: row header context menu | [`RowMenuParams`](api-reference.md#rowmenuparams) |
| [`results.corner.context`](#query-results-corner) | Query results: top left corner context menu | [`CornerMenuParams`](api-reference.md#cornermenuparams) |
| [`results.statusbar`](#query-results-visualize-menu) | Query results: **Visualize** menu | [`StatusbarMenuParams`](api-reference.md#statusbarmenuparams) |
| [`tableTable.cell.context`](#table-view-cell) | Table view: cell context menu | [`CellMenuParams`](api-reference.md#cellmenuparams) |
| [`tableTable.columnHeader.context`](#table-view-column-header) | Table view: column header context menu | [`ColumnMenuParams`](api-reference.md#columnmenuparams) |
| [`tableTable.rowHeader.context`](#table-view-row-header) | Table view: row header context menu | [`RowMenuParams`](api-reference.md#rowmenuparams) |
| [`tableTable.corner.context`](#table-view-corner) | Table view: top left corner context menu | [`CornerMenuParams`](api-reference.md#cornermenuparams) |
| [`tableTable.statusbar`](#table-view-visualize-menu) | Table view: **Visualize** menu | [`StatusbarMenuParams`](api-reference.md#statusbarmenuparams) |
| [`tab.query.header.context`](#query-tab-header) | Query tab header context menu | [`TabMenuParams`](api-reference.md#tabmenuparams) |
| [`tab.table.header.context`](#table-tab-header) | Table tab header context menu | [`TabMenuParams`](api-reference.md#tabmenuparams) |
| [`entity.table.context`](#sidebar-table) | Sidebar: table context menu | [`EntityMenuParams`](api-reference.md#entitymenuparams) |
| [`entity.schema.context`](#sidebar-schema) | Sidebar: schema context menu | [`EntityMenuParams`](api-reference.md#entitymenuparams) |
| [`entity.routine.context`](#sidebar-routine) | Sidebar: routine context menu | [`EntityMenuParams`](api-reference.md#entitymenuparams) |
| [`structure.statusbar.menu`](#table-structure-actions-menu) | Table structure view: actions menu | [`EntityMenuParams`](api-reference.md#entitymenuparams) |

The view params are what [`getViewContext()`](api-reference.md#getviewcontext) returns in `params`. See [Menu item params](manifest.md#menu-item-params) for details.

## App Menus

### New Tab Dropdown

`newTabDropdown` adds an item to the dropdown next to the **+** new tab button. Use it for views that don't need anything selected first.

![The new tab dropdown with a Table Overview item](/assets/images/plugin-placement-new-tab-dropdown.png){ width="223" }

```json
{
  "command": "table-overview",
  "name": "Table Overview",
  "view": "overview",
  "placement": "newTabDropdown",
  "icon": "dashboard"
}
```

### Tools Menu

`menubar.tools` adds an item to the **Tools** menu in the menu bar.

![The Tools menu with a Table Overview item](/assets/images/plugin-placement-menubar-tools.png){ width="237" }

```json
{
  "command": "table-overview",
  "name": "Table Overview",
  "view": "overview",
  "placement": "menubar.tools"
}
```

## Query Editor

### Query Editor Context Menu

`editor.query.context` adds an item to the context menu of the query editor. The view receives the editor's text, the selected text and the statement under the cursor.

![The query editor context menu with an Explain Query item](/assets/images/plugin-placement-editor-query-context.png){ width="477" }

```json
{
  "command": "explain-query",
  "name": "Explain Query",
  "view": "explain",
  "placement": "editor.query.context",
  "icon": "account_tree"
}
```

### Query Editor Toolbar

`editor.query.toolbar` adds a button to the query editor toolbar, next to **Run**. The button shows the item's `icon` and its whole `name`, so keep the name short: names longer than 20 characters log a warning to the developer console.

![An Explain button in the query editor toolbar](/assets/images/plugin-placement-editor-query-toolbar.png){ width="323" }

```json
{
  "command": "explain",
  "name": "Explain",
  "view": "explain",
  "placement": "editor.query.toolbar",
  "icon": "account_tree"
}
```

## Query Results

The results grid below the query editor has a context menu on its cells, column headers, row headers and top left corner, plus a **Visualize** menu in the status bar.

### Query Results Cell

`results.cell.context` adds an item to the context menu of a result cell.

![A result cell's context menu with an Inspect Value item](/assets/images/plugin-placement-results-cell-context.png){ width="233" }

```json
{
  "command": "inspect-value",
  "name": "Inspect Value",
  "view": "inspector",
  "placement": "results.cell.context",
  "icon": "data_object"
}
```

### Query Results Column Header

`results.columnHeader.context` adds an item to the context menu of a result column header.

![A result column header's context menu with a Profile Column item](/assets/images/plugin-placement-results-column-header-context.png){ width="291" }

```json
{
  "command": "profile-column",
  "name": "Profile Column",
  "view": "profiler",
  "placement": "results.columnHeader.context",
  "icon": "query_stats"
}
```

### Query Results Row Header

`results.rowHeader.context` adds an item to the context menu of a result row number.

![A result row header's context menu with an Inspect Row item](/assets/images/plugin-placement-results-row-header-context.png){ width="200" }

```json
{
  "command": "inspect-row",
  "name": "Inspect Row",
  "view": "inspector",
  "placement": "results.rowHeader.context",
  "icon": "view_agenda"
}
```

### Query Results Corner

`results.corner.context` adds an item to the context menu of the top left corner of the results grid, which acts on the whole result.

![The results grid corner context menu with a Summarize Rows item](/assets/images/plugin-placement-results-corner-context.png){ width="258" }

```json
{
  "command": "summarize",
  "name": "Summarize Rows",
  "view": "summary",
  "placement": "results.corner.context",
  "icon": "summarize"
}
```

### Query Results Visualize Menu

`results.statusbar` adds an item to the **Visualize** menu in the query results status bar. The view receives the selected cells, or the whole result when nothing is selected. Use [`enabledWhen`](manifest.md#pluginmenuitemcondition) to keep the item disabled until the result suits it. See [Status bar params](manifest.md#status-bar-params).

![The Visualize menu in the query results status bar with a Chart item](/assets/images/plugin-placement-results-statusbar.png){ width="330" }

```json
{
  "command": "chart",
  "name": "Chart",
  "view": "chart",
  "placement": "results.statusbar",
  "icon": "bar_chart"
}
```

## Table View

The table view (opened with **View Data**) has the same grid menus as the query results, with their own placements, so a plugin can choose to appear in either or both.

### Table View Cell

`tableTable.cell.context` adds an item to the context menu of a table cell.

![A table view cell's context menu with an Inspect Value item](/assets/images/plugin-placement-table-cell-context.png){ width="292" }

```json
{
  "command": "inspect-value",
  "name": "Inspect Value",
  "view": "inspector",
  "placement": "tableTable.cell.context",
  "icon": "data_object"
}
```

### Table View Column Header

`tableTable.columnHeader.context` adds an item to the context menu of a table column header.

![A table view column header's context menu with a Profile Column item](/assets/images/plugin-placement-table-column-header-context.png){ width="290" }

```json
{
  "command": "profile-column",
  "name": "Profile Column",
  "view": "profiler",
  "placement": "tableTable.columnHeader.context",
  "icon": "query_stats"
}
```

### Table View Row Header

`tableTable.rowHeader.context` adds an item to the context menu of a table row number.

![A table view row header's context menu with an Inspect Row item](/assets/images/plugin-placement-table-row-header-context.png){ width="200" }

```json
{
  "command": "inspect-row",
  "name": "Inspect Row",
  "view": "inspector",
  "placement": "tableTable.rowHeader.context",
  "icon": "view_agenda"
}
```

### Table View Corner

`tableTable.corner.context` adds an item to the context menu of the top left corner of the table view.

![The table view corner context menu with a Summarize Rows item](/assets/images/plugin-placement-table-corner-context.png){ width="258" }

```json
{
  "command": "summarize",
  "name": "Summarize Rows",
  "view": "summary",
  "placement": "tableTable.corner.context",
  "icon": "summarize"
}
```

### Table View Visualize Menu

`tableTable.statusbar` adds an item to the **Visualize** menu in the table view status bar. With nothing selected, the view receives the table and its filters instead of rows. See [Status bar params](manifest.md#status-bar-params).

![The Visualize menu in the table view status bar with a Chart item](/assets/images/plugin-placement-table-statusbar.png){ width="238" }

```json
{
  "command": "chart",
  "name": "Chart",
  "view": "chart",
  "placement": "tableTable.statusbar",
  "icon": "bar_chart"
}
```

To show the same item in both **Visualize** menus, list both placements: `"placement": ["results.statusbar", "tableTable.statusbar"]`.

## Tabs

### Query Tab Header

`tab.query.header.context` adds an item to the context menu of a query tab's header.

![A query tab header's context menu with a Share Query item](/assets/images/plugin-placement-tab-query-header-context.png){ width="234" }

```json
{
  "command": "share-query",
  "name": "Share Query",
  "view": "share",
  "placement": "tab.query.header.context",
  "icon": "share"
}
```

### Table Tab Header

`tab.table.header.context` adds an item to the context menu of a table tab's header.

![A table tab header's context menu with a Profile Table item](/assets/images/plugin-placement-tab-table-header-context.png){ width="239" }

```json
{
  "command": "profile-table",
  "name": "Profile Table",
  "view": "profiler",
  "placement": "tab.table.header.context",
  "icon": "query_stats"
}
```

## Sidebar

The entity list in the sidebar has a context menu for each kind of entity. Schemas and routines only appear for databases that have them, such as PostgreSQL.

### Sidebar Table

`entity.table.context` adds an item to the context menu of a table in the sidebar.

![A table's context menu in the sidebar with a Profile Table item](/assets/images/plugin-placement-entity-table-context.png){ width="274" }

```json
{
  "command": "profile-table",
  "name": "Profile Table",
  "view": "profiler",
  "placement": "entity.table.context",
  "icon": "query_stats"
}
```

### Sidebar Schema

`entity.schema.context` adds an item to the context menu of a schema in the sidebar.

![A schema's context menu in the sidebar with a Schema Overview item](/assets/images/plugin-placement-entity-schema-context.png){ width="295" }

```json
{
  "command": "schema-overview",
  "name": "Schema Overview",
  "view": "overview",
  "placement": "entity.schema.context",
  "icon": "schema"
}
```

### Sidebar Routine

`entity.routine.context` adds an item to the context menu of a function or stored procedure in the sidebar.

![A routine's context menu in the sidebar with a Document Function item](/assets/images/plugin-placement-entity-routine-context.png){ width="284" }

```json
{
  "command": "document-function",
  "name": "Document Function",
  "view": "docs",
  "placement": "entity.routine.context",
  "icon": "functions"
}
```

## Table Structure

### Table Structure Actions Menu

`structure.statusbar.menu` adds an item to the actions menu (the gear button) in the status bar of the table structure view.

![The table structure actions menu with a Generate Docs item](/assets/images/plugin-placement-structure-statusbar-menu.png){ width="307" }

```json
{
  "command": "generate-docs",
  "name": "Generate Docs",
  "view": "docs",
  "placement": "structure.statusbar.menu",
  "icon": "description"
}
```

## Next Steps

- **[Plugin Views](plugin-views.md)** - The tab types a menu item can open
- **[Manifest Reference](manifest.md)** - Every manifest field, including `enabledWhen`
- **[SDK Reference](api-reference.md#getviewcontext)** - Read the view params with `getViewContext()`
