---
title: Plugin SDK
summary: "The Beekeeper Studio Plugin SDK and Vite build plugin: what they do and how to install them."
icon: material/package-variant-closed
---

# Plugin SDK

Beekeeper Studio provides two open source packages for building plugins:

| Package | What it does | Links |
| ------- | ------------ | ----- |
| **Beekeeper Studio Plugin SDK** (`@beekeeperstudio/plugin`) | TypeScript SDK your plugin uses to talk to Beekeeper Studio | [GitHub](https://github.com/beekeeper-studio/plugin) · [npm](https://www.npmjs.com/package/@beekeeperstudio/plugin) · [SDK Reference](api-reference.md) |
| **Vite build plugin** (`@beekeeperstudio/vite-plugin`) | Hot reloading during development and production builds for Beekeeper Studio | [GitHub](https://github.com/beekeeper-studio/vite-plugin) · [npm](https://www.npmjs.com/package/@beekeeperstudio/vite-plugin) |

Both packages are MIT licensed.

## Beekeeper Studio Plugin SDK

Plugins run in a sandboxed `<iframe>` and talk to Beekeeper Studio with `postMessage`. The SDK wraps those messages in typed, promise-based functions, so you don't have to handle the message protocol yourself.

### Installation

=== "npm"
    ```bash
    npm install @beekeeperstudio/plugin
    ```

=== "yarn"
    ```bash
    yarn add @beekeeperstudio/plugin
    ```

=== "pnpm"
    ```bash
    pnpm add @beekeeperstudio/plugin
    ```

### Usage

```typescript
// Forwards keyboard and mouse events to Beekeeper Studio
import "@beekeeperstudio/plugin/dist/eventForwarder";
import { getTables, runQuery } from "@beekeeperstudio/plugin";

// Get all tables in the current database
const tables = await getTables();

// Run a SQL query
const result = await runQuery("SELECT * FROM users LIMIT 10");
```

### Features

- **Database metadata**: list schemas, tables, columns, primary keys, foreign keys and indexes with [`getSchemas`](api-reference.md#getschemas), [`getTables`](api-reference.md#gettables), [`getColumns`](api-reference.md#getcolumns) and related functions.
- **Queries**: run SQL against the active connection with [`runQuery`](api-reference.md#runquery), and show results in Beekeeper Studio's result table with [`expandTableResult`](api-reference.md#expandtableresult).
- **Connection and app info**: read connection details, the app version and theme, and update status with [`getConnectionInfo`](api-reference.md#getconnectioninfo), [`getAppInfo`](api-reference.md#getappinfo) and [`checkForUpdate`](api-reference.md#checkforupdate).
- **Views and tabs**: read how a view was opened with [`getViewContext`](api-reference.md#getviewcontext), keep per-view state with [`getViewState`](api-reference.md#getviewstate) and [`setViewState`](api-reference.md#setviewstate), set the tab title, open query and table tabs with [`openTab`](api-reference.md#opentab), and control the status bar.
- **Storage**: save plugin data, optionally encrypted, with [`appStorage`](api-reference.md#appstoragegetitem).
- **App UI**: show toast notifications with [`noty`](api-reference.md#notyinfo) and confirmation dialogs with [`confirm`](api-reference.md#confirm).
- **System integration**: read and write the [clipboard](api-reference.md#clipboardwritetext), open native save dialogs with [`requestFileSave`](api-reference.md#requestfilesave) and open links in the browser with [`openExternal`](api-reference.md#openexternal).
- **Events**: react to [theme changes](api-reference.md#themechanged), [table changes](api-reference.md#tableschanged) and [window events](api-reference.md#windowevent), and send messages between your plugin's views with [`broadcast`](api-reference.md#broadcastpost).
- **Keyboard and mouse forwarding**: importing `@beekeeperstudio/plugin/dist/eventForwarder` passes app shortcuts and pointer events from your plugin through to Beekeeper Studio.
- **Debugging**: log every message with [`setDebugComms`](api-reference.md#setdebugcomms) and write to the app log with [`log.error`](api-reference.md#logerror).
- **TypeScript types**: typed requests and responses, plus shared models such as [`Table`](api-reference.md#table), [`QueryResult`](api-reference.md#queryresult) and the [context menu params](manifest.md#menu-item-params).

The [SDK Reference](api-reference.md) documents every function, event and type.

## Vite Build Plugin

[`@beekeeperstudio/vite-plugin`](https://github.com/beekeeper-studio/vite-plugin) is the recommended way to build a plugin with [Vite](https://vite.dev). It:

- Enables **hot module replacement** inside Beekeeper Studio during development
- Rewrites your HTML for production builds so bundled assets load correctly in the app

You still use the SDK in your plugin code; the build plugin only changes how it is built and served.

### Installation

=== "npm"
    ```bash
    npm install --save-dev @beekeeperstudio/vite-plugin
    ```

=== "yarn"
    ```bash
    yarn add -D @beekeeperstudio/vite-plugin
    ```

=== "pnpm"
    ```bash
    pnpm add -D @beekeeperstudio/vite-plugin
    ```

### Configuration

Add it to `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import bks from "@beekeeperstudio/vite-plugin";

export default defineConfig({
  plugins: [bks()],
});
```

By default it transforms `index.html` into `dist/index.html`, which matches a view `entry` of `dist/index.html` in your [manifest](manifest.md). If your plugin has more than one HTML page, list each one with the `entrypoints` option:

```typescript
export default defineConfig({
  plugins: [
    bks({
      entrypoints: [
        { input: "index.html", output: "dist/index.html" },
        { input: "config.html", output: "dist/config.html" },
      ],
    }),
  ],
});
```

## Next Steps

- **[Creating Your First Plugin](creating-your-first-plugin.md)**: build a plugin with the SDK and the Vite build plugin
- **[SDK Reference](api-reference.md)**: every function, event and type in the SDK
- **[Manifest Reference](manifest.md)**: describe your plugin's views and menus
