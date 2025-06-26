---
title: Plugin Views
summary: "Learn about the different types of plugin views available in Beekeeper Studio and how to implement them."
icon: material/view-dashboard
---

# Plugin Views

!!! warning "Beta Feature"
    The plugin system is currently in beta. APIs and functionality may change in future releases. Please provide feedback and report issues to help us improve the system.

Plugins can integrate with Beekeeper Studio through different types of views, each designed for specific use cases. Views define where and how your plugin's interface appears within the application.

## Tab Views

Tab views appear as tabs in the main workspace area, alongside query tabs and other content.

### Plain (Planned)

!!! info "Coming Soon"
    Plain views are planned for future releases and will provide full-tab real estate for your plugin.

Plain views will offer the entire tab space for your plugin's interface, without any predefined sections.

### Shell

The shell view is perfect for plugins that need to display data or results. It provides:

- **Top Section**: Your plugin's iframe interface
- **Bottom Section**: A built-in result table for displaying data

This layout is ideal for plugins that query or analyze data, as users can interact with your plugin controls at the top and see results in the familiar table format below.

![Shell View Example](/assets/images/plugin-shell-view.png)

**Manifest Example:**

```json
{
  "capabilities": {
    "views": [
      {
        "id": "data-analyzer",
        "name": "Data Analyzer",
        "type": "shell-tab",
        "entry": "index.html",
      }
    ]
  }
}
```

## Sidebar Views (Planned)

!!! info "Coming Soon"
    Sidebar views are planned for future releases.

Sidebar views appear as persistent panels in the application's sidebar, remaining visible while users work with other content.

![Sidebar View Example](/assets/images/plugin-sidebar-view.png)

**Manifest Example:**

```json
{
  "capabilities": {
    "views": [
      {
        "id": "quick-reference",
        "name": "SQL Reference",
        "type": "secondary-sidebar",
        "entry": "sidebar.html",
      }
    ]
  }
}
```

## Multiple Views

A single plugin can declare multiple views:

```json
{
  "capabilities": {
    "views": [
      {
        "id": "main-interface",
        "name": "Data Processor",
        "type": "shell-tab",
        "entry": "main.html",
      },
      {
        "id": "quick-tools",
        "name": "Quick Tools",
        "type": "secondary-sidebar",
        "entry": "tools.html",
      }
    ]
  }
}
```

## View State

Each plugin view can store and retrieve its own state using the `getViewState` and `setViewState` API methods. This state persists across application restarts.

### State Isolation

View state is isolated per view instance. This means:

- Each view maintains its own separate state
- Views cannot access each other's state
- If a user opens multiple tabs of the same plugin, each tab has its own independent state

For example, if the user creates two tabs form AI Shell, each tab will maintain completely separate state data and cannot access the other tab's stored information.

### Example

```javascript
// Save state when user interacts
await request('setViewState', {
    conversations: [
        "Ai: Hello, how can I help you today?",
        "Human: Make a plain sandwich recipe using SQL.",
    ]
});

// Restore state when view loads
const state = await request('getViewState');
if (state) {
    setConversations(state.conversations);
}
```

## Next Steps

- **[Creating Plugins](creating-plugins.md)** - Learn how to build your first plugin
- **[Manifest Reference](manifest.md)** - Complete manifest file documentation
- **[API Reference](api-reference.md)** - Available plugin APIs
