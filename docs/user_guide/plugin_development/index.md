---
title: Plugin Development
summary: "Learn how to develop, distribute, and manage plugins for Beekeeper Studio to extend its functionality."
icon: material/puzzle
---

# Plugin Development

!!! warning "Beta Feature"
    The plugin system is currently in beta. APIs and functionality may change in future releases. Please provide feedback and report issues to help us improve the system.

The Beekeeper Studio Plugin System allows developers to extend the application's functionality through web-based plugins. Plugins run in secure, sandboxed environments and communicate with the main application through a structured API.

## What Are Plugins?

Plugins are web applications (HTML, CSS, JavaScript) that run inside Beekeeper Studio to provide additional functionality. They can:

- Add custom interfaces for database interaction
- Create specialized tools for data analysis and manipulation
- Integrate with external services and APIs
- Provide domain-specific functionality for your workflow

## Plugin Types

### Tab Plugins (Shell Type)
The main plugin type that creates new tab interfaces with:
- Custom HTML/JavaScript interface at the top
- Built-in result table at the bottom for displaying query results
- Full access to the Plugin API for database operations

## Getting Started

### For Users
- **Installing Plugins**: Use the Plugin Manager in Tools → Manage Plugins
- **Managing Plugins**: Enable/disable auto-updates, uninstall unwanted plugins
- **Finding Plugins**: Browse the central plugin registry

### For Developers
- **[Creating Your First Plugin](creating-plugins.md)**: Step-by-step guide to building a plugin
- **[Plugin API Reference](api-reference.md)**: Complete API documentation with installation instructions
- **[Publishing Plugins](publishing-plugins.md)**: How to distribute your plugin

#### Quick Start - Setting up TypeScript Support

Install the plugin types package for TypeScript support and autocomplete:

```bash
npm install github:beekeeperstudio/plugin
```

Then import API functions in your plugin code:

```javascript
import { getTables, runQuery, setTabTitle } from '@beekeeperstudio/plugin';
```

### Key Components
- **Plugin Manager**: Handles installation, updates, and lifecycle
- **Plugin Registry**: Central discovery system for available plugins
- **Communication Layer**: Secure message passing between plugin and app
- **UI Integration**: Seamless integration with application interface

## Next Step

- **[Start Building](creating-plugins.md)** - Create your first plugin
