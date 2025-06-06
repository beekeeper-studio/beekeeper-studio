---
title: Plugin API Reference
summary: "Complete API reference for Beekeeper Studio plugin development."
icon: material/api
---

# Plugin API Reference

!!! warning "Beta Feature"
    The plugin system is currently in beta. APIs and functionality may change in future releases. Please provide feedback and report issues to help us improve the system.

The Beekeeper Studio Plugin API is accessible through the `@beekeeperstudio/plugin` package. The API provides three main functions for communication between your plugin and the main application.

## Installation

Install the plugin package from GitHub:

```bash
npm install github:beekeeper-studio/plugin
```

## Import API Functions

```javascript
import { request, notify, addNotificationListener } from '@beekeeperstudio/plugin';
```

## How It Works

The `@beekeeperstudio/plugin` package is a thin wrapper around `window.postMessage` for communication between your plugin (iframe) and Beekeeper Studio. It provides type safety, promises, and automatic request/response matching.

## Core API Functions

The plugin API consists of three main functions:

### `request(name, args?)`
Send requests to Beekeeper Studio to retrieve data or execute actions. Internally uses `window.parent.postMessage()` with a unique ID and waits for a response.

### `notify(name, args)`
Send one-way notifications to the main application. Uses `window.parent.postMessage()` without expecting a response.

### `addNotificationListener(name, callback)`
Listen for notifications from the main application (like theme changes). Sets up a `window.addEventListener('message')` handler internally.

---

## Available Request Types

### getTables

Get a list of tables from the current database.

**Usage:**
```javascript
// Get all tables
const tables = await request('getTables');

// Get tables from specific schema
const tables = await request('getTables', { schema: 'public' });
```

**Response:**
```javascript
[
  {
    name: "users",
    schema: "public",
    entityType: "table"
  },
  {
    name: "orders",
    schema: "public",
    entityType: "table"
  }
]
```

---

### getColumns

Get column information for a specific table.

**Usage:**
```javascript
const columns = await request('getColumns', {
  table: 'users',
  schema: 'public'  // optional
});
```

**Response:**
```javascript
[
  {
    name: "id",
    dataType: "integer",
    nullable: false,
    primaryKey: true,
    defaultValue: null
  },
  {
    name: "email",
    dataType: "varchar",
    nullable: false,
    primaryKey: false,
    defaultValue: null
  }
]
```

---

### runQuery

Execute a SQL query against the current database.

!!! warning "No Query Sanitization"
    The query will be executed exactly as provided with no modification or sanitization. Always validate and sanitize user input before including it in queries to prevent unwanted actions.

**Usage:**
```javascript
const result = await request('runQuery', {
  query: 'SELECT * FROM users WHERE active = true LIMIT 10'
});
```

**Response:**
```javascript
[
  {
    rows: [
      { id: 1, email: 'user1@example.com', active: true },
      { id: 2, email: 'user2@example.com', active: true }
    ],
    fields: [
      { name: 'id', dataType: 'integer' },
      { name: 'email', dataType: 'varchar' },
      { name: 'active', dataType: 'boolean' }
    ],
    rowCount: 2,
    affectedRows: 0
  }
]
```

---

### getConnectionInfo

Get information about the current database connection.

**Usage:**
```javascript
const connectionInfo = await request('getConnectionInfo');
```

**Response:**
```javascript
{
  connectionType: "postgresql",
  database: "myapp_production",
  host: "localhost",
  port: 5432,
  username: "myuser",
  // Note: password and other sensitive info are not included
  ssl: true,
  version: "13.7"
}
```

**Supported Connection Types:**
- `postgresql`
- `mysql`
- `mariadb`
- `sqlite`
- `sqlserver`
- `oracle`
- `mongodb`
- `cassandra`
- `clickhouse`
- `firebird`
- `bigquery`
- `redshift`
- `duckdb`
- `libsql`

---

### getAllTabs

Get information about all open tabs.

**Usage:**
```javascript
const tabs = await request('getAllTabs');
```

**Response:**
```javascript
[
  {
    id: "tab-123",
    title: "My Plugin Tab",
    type: "plugin",
    active: true
  },
  {
    id: "tab-124",
    title: "Query #1",
    type: "query",
    active: false
  }
]
```

---

### setTabTitle

Set the title of the current plugin tab.

**Usage:**
```javascript
await request('setTabTitle', { title: 'Data Analysis Tool' });
```

---

### expandTableResult

Display query results in the bottom table panel (shell-type tabs only).

**Usage:**
```javascript
await request('expandTableResult', {
  results: [
    {
      rows: [
        { id: 1, name: 'John', age: 30 },
        { id: 2, name: 'Jane', age: 25 }
      ],
      fields: [
        { name: 'id', dataType: 'integer' },
        { name: 'name', dataType: 'varchar' },
        { name: 'age', dataType: 'integer' }
      ],
      rowCount: 2
    }
  ]
});
```

!!! tip "Table Display Tips"
    - Results will replace any existing table data
    - Large datasets may be paginated automatically
    - Field definitions help with proper data formatting
    - Use this for displaying query results, analysis output, etc.

---

## Notifications

### addNotificationListener

Listen for notifications from the main application.

**Usage:**
```javascript
addNotificationListener('themeChanged', (args) => {
  console.log('Theme changed to:', args.theme);
  // Update your plugin's theme
});
```

**Available Notifications:**
- `themeChanged` - Fired when the application theme changes

### notify

Send notifications to the main application.

**Usage:**
```javascript
notify('myCustomNotification', { data: 'some data' });
```
