---
title: Plugin API Reference
summary: "Complete API reference for Beekeeper Studio plugin development."
icon: material/api
---

# Plugin API Reference

!!! warning "Beta Feature"
    The plugin system is in beta (available in Beekeeper Studio 5.3+). Things might change, but we'd love your feedback!

The Beekeeper Studio Plugin API is accessible through the `@beekeeperstudio/plugin` package. The API provides communication between your plugin and the main application.

## Installation

=== "npm"
    ```bash
    npm install @beekeeperstudio/plugin
    ```

=== "yarn"
    ```bash
    yarn add @beekeeperstudio/plugin
    ```

## Core Functions

| Function | Description |
|----------|-------------|
| `request(name, args?)` | Send requests to Beekeeper Studio to retrieve data or execute actions. Returns a Promise. |
| `notify(name, args)` | Send one-way notifications to the main application without expecting a response. |
| `addNotificationListener(name, callback)` | Listen for notifications from the main application (like theme changes). |
| `setDebugComms(enabled)` | Enable or disable debug logging for plugin communication. Useful for development. |

## Debugging

### setDebugComms

Enable debug logging to see all communication between your plugin and Beekeeper Studio. This is helpful when developing plugins to understand what messages are being sent and received.

**Usage:**
```javascript
// Enable debug logging
setDebugComms(true);

// Now all communication will be logged to the browser console
const tables = await getTables();

// Disable debug logging
setDebugComms(false);
```

**Arguments Schema:**
```typescript
{ enabled: boolean }
```

!!! tip "Development Workflow"
    Enable debug communications early in your development process to see exactly what data is being exchanged. This makes it much easier to troubleshoot issues and understand the plugin API behavior.

## Request Methods

### getTables

Get a list of tables from the current database.

**Usage:**
```javascript
// Get all tables
const tables = await getTables();

// Get tables from specific schema
const tables = await getTables({ schema: 'public' });
```

**Example Response:**
```javascript
[
  {
    name: "users",
    schema: "public"
  },
  {
    name: "orders",
    schema: "public"
  }
]
```

**Arguments Schema:**
```typescript
{ schema?: string }
```

**Response Schema:**
```typescript
{ name: string; schema?: string }[]
```

### getColumns

Get column information for a specific table.

**Usage:**
```javascript
const columns = await getColumns({
  table: 'users',
  schema: 'public'
});
```

**Example Response:**
```javascript
[
  {
    name: "id",
    type: "integer"
  },
  {
    name: "email",
    type: "varchar"
  }
]
```

**Arguments Schema:**
```typescript
{ table: string; schema?: string }
```

**Response Schema:**
```typescript
{ name: string; type: string }[]
```

### runQuery

Execute a SQL query against the current database.

!!! warning "No Query Sanitization"
    The query will be executed exactly as provided with no modification or sanitization. Always validate and sanitize user input before including it in queries to prevent unwanted actions.

**Usage:**
```javascript
const result = await runQuery({
  query: 'SELECT * FROM users WHERE active = true LIMIT 10'
});
```

**Example Response:**
```javascript
{
  results: [
    {
      fields: [
        { id: "1", name: "id", dataType: "integer" },
        { id: "2", name: "email", dataType: "varchar" }
      ],
      rows: [
        { id: 1, email: "user1@example.com" },
        { id: 2, email: "user2@example.com" }
      ]
    }
  ]
}
```

**Arguments Schema:**
```typescript
{ query: string }
```

**Response Schema:**
```typescript
{
  results: {
    fields: { id: string; name: string; dataType?: string }[];
    rows: Record<string, unknown>[];
  }[];
  error?: unknown;
}
```

### getConnectionInfo

Get information about the current database connection.

**Usage:**
```javascript
const connectionInfo = await getConnectionInfo();
```

**Example Response:**
```javascript
{
  connectionType: "postgresql",
  databaseName: "myapp_production",
  defaultSchema: "public",
  readOnlyMode: false
}
```

**Response Schema:**
```typescript
{
  connectionType: string;
  databaseName: string;
  defaultSchema?: string;
  readOnlyMode: boolean;
}
```

**Supported Connection Types:**

| Value | Database |
|-------|----------|
| `postgresql` | PostgreSQL |
| `mysql` | MySQL |
| `mariadb` | MariaDB |
| `sqlite` | SQLite |
| `sqlserver` | SQL Server |
| `oracle` | Oracle Database |
| `mongodb` | MongoDB |
| `cassandra` | Apache Cassandra |
| `clickhouse` | ClickHouse |
| `firebird` | Firebird |
| `bigquery` | Google BigQuery |
| `redshift` | Amazon Redshift |
| `duckdb` | DuckDB |
| `libsql` | LibSQL |

### setTabTitle

Set the title of the current plugin tab.

**Usage:**
```javascript
await setTabTitle({ title: 'Data Analysis Tool' });
```

**Arguments Schema:**
```typescript
{ title: string }
```

### expandTableResult

Display query results in the bottom table panel (shell-type tabs only).

**Usage:**
```javascript
await expandTableResult({
  results: [
    {
      fields: [
        { id: "1", name: 'id', dataType: 'integer' },
        { id: "2", name: 'name', dataType: 'varchar' }
      ],
      rows: [
        { id: 1, name: 'John', age: 30 }
      ]
    }
  ]
});
```

**Arguments Schema:**
```typescript
{
  results: {
    fields: { id: string; name: string; dataType?: string }[];
    rows: Record<string, unknown>[];
  }[]
}
```

!!! tip "Table Display Tips"
    - Results will replace any existing table data
    - Datasets are not paginated. Be aware of large datasets!

### getViewState

Get the current state of your view instance.

!!! tip "Learn more about View State [here](plugin-views.md#view-state)."

**Usage:**
```javascript
const state = await getViewState();
console.log('Current state:', state);
```

**Response Schema:**
```typescript
any
```

### setViewState

Store state for your view instance.

!!! tip "Learn about more about View State [here](plugin-views.md#view-state)."

**Usage:**
```javascript
await setViewState({
  state: {
    selectedTable: 'users',
    filters: ['active = true']
  }
});
```

**Arguments Schema:**
```typescript
any
```

### noty.info

Display an informational notification toast message to the user.

**Usage:**
```javascript
import { noty } from '@beekeeperstudio/plugin';

await noty.info('Query executed in 2.3 seconds');
```

**Arguments Schema:**
```typescript
{ message: string }
```

### noty.success

Display a success notification toast message to the user.

**Usage:**
```javascript
import { noty } from '@beekeeperstudio/plugin';

await noty.success('Data imported successfully!');
```

**Arguments Schema:**
```typescript
{ message: string }
```

### noty.error

Display an error notification toast message to the user.

**Usage:**
```javascript
import { noty } from '@beekeeperstudio/plugin';

await noty.error('Failed to connect to the database');
```

**Arguments Schema:**
```typescript
{ message: string }
```

### noty.warning

Display a warning notification toast message to the user.

**Usage:**
```javascript
import { noty } from '@beekeeperstudio/plugin';

await noty.warning('This operation may take a while');
```

**Arguments Schema:**
```typescript
{ message: string }
```

### confirm

Display a confirmation dialog to the user and wait for their response.

**Usage:**
```javascript
import { confirm } from '@beekeeperstudio/plugin';

// Basic confirmation
const result = await confirm();
if (result) {
  // User clicked confirm
} else {
  // User clicked cancel
}

// With title and message
const result = await confirm('Delete Table', 'Are you sure you want to delete this table?');

// With custom button labels
const result = await confirm(
  'Export Data',
  'This will export all data to a CSV file. Continue?',
  {
    confirmLabel: 'Export',
    cancelLabel: 'Cancel'
  }
);
```

**Arguments Schema:**
```typescript
{
  title?: string;
  message?: string;
  options?: {
    confirmLabel?: string;
    cancelLabel?: string;
  };
}
```

**Response Schema:**
```typescript
boolean // true if confirmed, false if cancelled
```

## Notifications

### themeChanged

Fired when the application theme changes.

**Usage:**
```javascript
addNotificationListener('themeChanged', (args) => {
  // Apply new theme to your plugin
  document.documentElement.style.setProperty('--primary-color', args.palette.primary);
  document.body.className = `theme-${args.type}`;
});
```

**Schema:**
```typescript
{
  palette: Record<string, string>;
  cssString: string;
  type: "dark" | "light";
}
```

### windowEvent

!!! info "Internal Use"
    This notification is primarily for internal use.

Fired for various window events.

**Usage:**
```javascript
addNotificationListener('windowEvent', (args) => {
  if (args.eventType === 'resize') {
    // Handle window resize
    adjustLayout();
  }
});
```

**Schema:**
```typescript
{
  eventType: string;
  eventClass: "MouseEvent" | "KeyboardEvent" | "PointerEvent" | "Event";
  eventInitOptions: MouseEventInit | KeyboardEventInit | PointerEventInit;
}
```

## Type Definitions

### Result

| Property      | Type       | Description |
|---------------|------------|-------------|
| `rows`        | `object[]` | Array of result rows |
| `fields`      | `Field[]`  | Array of field definitions |
| `rowCount`    | `number`   | Number of rows returned |
| `affectedRows`| `number`   | Number of rows affected (for INSERT/UPDATE/DELETE) |

### Field

| Property   | Type     | Description |
|------------|----------|-------------|
| `name`     | `string` | Column name |
| `dataType` | `string` | Column data type |

### Column

| Property       | Type      | Description |
|----------------|-----------|-------------|
| `name`         | `string`  | Column name |
| `dataType`     | `string`  | Column data type |
| `nullable`     | `boolean` | Whether column allows NULL values |
| `primaryKey`   | `boolean` | Whether column is part of primary key |
| `defaultValue` | `any`     | Default value for the column |

### Table

| Property     | Type     | Description |
|--------------|----------|-------------|
| `name`       | `string` | Table name |
| `schema`     | `string` | Schema name |
| `entityType` | `string` | Type of entity (typically "table") |

### Tab

| Property | Type      | Description |
|----------|-----------|-------------|
| `id`     | `string`  | Unique tab identifier |
| `title`  | `string`  | Tab display title |
| `type`   | `string`  | Tab type ("plugin", "query", etc.) |
| `active` | `boolean` | Whether tab is currently active |

