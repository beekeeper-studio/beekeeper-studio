---
title: Introduction
summary: "Learn how to develop, distribute, and manage plugins for Beekeeper Studio to extend its functionality."
icon: material/puzzle
---

# Introduction

!!! warning "Beta Feature"
    The plugin system is currently in beta. APIs and functionality may change in future releases. Please provide feedback and report issues to help us improve the system.

The Beekeeper Studio Plugin System allows developers to extend the application's functionality through user interface (UI). Plugins run in an `<iframe>` which means they are sandboxed and communicate with the main application through a structured API.

![Plugin Manager showing two installed plugins, and the detail information of the AI Shell plugin](/assets/images/plugin-manager-modal.png)

## What Are Plugins?

Plugins are web apps (HTML, CSS, JavaScript) that run inside Beekeeper Studio to provide additional functionality.

## How Plugins Work

Beekeeper Studio plugins run as standalone web apps embedded inside an `<iframe>`. Each plugin is isolated and communicates with the host application using [postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).

Here's a breakdown of the internal flow:

### 1. Plugin Discovery

Beekeeper Studio fetches a plugin index (a JSON file) from the central plugin registry:

```
https://raw.githubusercontent.com/beekeeper-studio/beekeeper-studio-plugins/main/plugins.json
```

Each entry in this file points to a plugin manifest, which contains metadata, UI configuration, and the plugin entry point URL.

You can explore or contribute to the plugin registry on GitHub: [beekeeper-studio/beekeeper-studio-plugins](https://github.com/beekeeper-studio/beekeeper-studio-plugins)

### 2. Installation

When a plugin is installed via the Plugin Manager:

- The plugin's manifest is downloaded.

- The manifest points to a `.zip` archive containing the plugin bundle (HTML/CSS/JS assets).

- The archive is unpacked and stored locally inside Beekeeper Studio's plugin directory.

### 3. Sandboxed Execution

Each plugin is loaded into an `<iframe>` with `sandbox` attributes, limiting access to the host environment unless explicitly permitted via the plugin API. The iframe is served using a custom Electron protocol: `plugin://`, which is defined specifically for Beekeeper Studio. This protocol helps isolate plugins from external web content and is only accessible within the Beekeeper Studio application.

### 4. Message-Passing Communication

Plugins communicate with Beekeeper Studio using `postMessage`. This system supports two kinds of messages: **requests** and **notifications**.

- A **request** expects a response. For example, calling `getTables` will return a list of tables.

- A **notification** sends data without expecting a reply. For instance, when the theme changes, Beekeeper Studio notifies the plugin via a `themeChanged` notification.

The [@beekeeperstudio/plugin](https://www.npmjs.com/package/@beekeeperstudio/plugin) package provides helper functions for handling communication:

- `request(name, args)` – An async function for sending requests and receiving responses.

- `addNotificationListener(name, handler)` – Register a handler for incoming notifications.

- `notify(name, args)` – Send a notification to Beekeeper Studio. Currently, plugins don’t need to use this, as the app doesn’t handle any incoming plugin notifications yet.

### 5. UI Integration

Plugins declare their views (tabs or sidebars) in the manifest file. Beekeeper Studio renders these views dynamically and injects the corresponding `<iframe>` into the designated location in the UI.

## Next Step

-   **[Start Building](creating-plugins.md)** - Create your first plugin
