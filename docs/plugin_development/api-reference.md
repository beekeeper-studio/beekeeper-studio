---
title: Plugin API Reference
summary: "Complete API reference for Beekeeper Studio plugin development."
icon: material/api
---

# Plugin API Reference

!!! warning "Beta Feature"
    The plugin system is in beta (available in Beekeeper Studio 5.3+). We'd love your feedback!

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

## Debugging

### setDebugComms

Enable debug logging to see all communication between your plugin and Beekeeper Studio. This is helpful when developing plugins to understand what messages are being sent and received.

**Usage:**
```typescript
setDebugComms(true);
```

**Signature:**
```typescript
function setDebugComms(enabled: boolean);
```

### log.error

Log an error message to the application log.

**Usage:**
```typescript
import { log } from "@beekeeperstudio/plugin";
log.error('An error occurred');
```

**Signature:**
```typescript
function error(err: string | Error): void;
```

## Request Methods

### getTables

Get a list of tables from the current database.

**Usage:**
```typescript
import { getTables } from '@beekeeperstudio/plugin';

// Get all tables
const tables = await getTables();

// Get tables from specific schema
const tables = await getTables('public');
```

**Example Response:**
```typescript
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

**Signature:**
```typescript
async function getTables(schema?: string): Promise<{
  name: string;
  schema?: string;
}[]>;
```

### getColumns

Get column information for a specific table.

**Usage:**
```typescript
import { getColumns } from '@beekeeperstudio/plugin';
const columns = await getColumns('users', 'public');
```

**Example Response:**
```typescript
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

**Signature:**
```typescript
async function getColumns(table: string, schema?: string): Promise<{
  name: string;
  type: string;
}[]>;
```

### runQuery

Execute a SQL query against the current database.

!!! warning "No Query Sanitization"
    The query will be executed exactly as provided with no modification or sanitization. Always validate and sanitize user input before including it in queries to prevent unwanted actions.

**Usage:**
```typescript
import { runQuery } from '@beekeeperstudio/plugin';
const result = await runQuery({
  query: 'SELECT * FROM users WHERE active = true LIMIT 10'
});
```

**Example Response:**
```typescript
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

**Signature:**
```typescript
async function runQuery(query: string): Promise<{
  results: QueryResult[];
  error?: unknown;
}>;
```

### getConnectionInfo

Get information about the current database connection.

**Usage:**
```typescript
import { getConnectionInfo } from '@beekeeperstudio/plugin';
const connectionInfo = await getConnectionInfo();
```

**Example Response:**
```typescript
{
  databaseType: "postgresql",
  databaseName: "myapp_production",
  defaultSchema: "public",
  readOnlyMode: false
}
```

**Signature:**
```typescript
async function getConnectionInfo(): Promise<{
  databaseType: 'postgresql' | 'mysql' | 'mariadb' | 'sqlite' | 'sqlserver' | 'oracle' | 'mongodb' | 'cassandra' | 'clickhouse' | 'firebird' | 'bigquery' | 'redshift' | 'duckdb' | 'libsql' | 'redis' | 'surrealdb' | 'trino';
  databaseName: string;
  defaultSchema?: string;
  readOnlyMode: boolean;
}>;
```

### setTabTitle

Set the title of the current plugin tab.

**Usage:**
```typescript
import { setTabTitle } from '@beekeeperstudio/plugin';
await setTabTitle('Data Analysis Tool');
```

**Signature:**
```typescript
async function setTabTitle(title: string): Promise<void>;
```

### expandTableResult

Display query results in the bottom table panel (shell-type tabs only).

**Usage:**
```typescript
import { expandTableResult } from '@beekeeperstudio/plugin';
await expandTableResult([{
  fields: [
    { id: "1", name: 'id', dataType: 'integer' },
    { id: "2", name: 'name', dataType: 'varchar' },
  ],
  rows: [
    { id: 1, name: 'John', age: 30 },
  ],
}]);
```

**Signature:**
```typescript
async function expandTableResult(
  results: {
    fields: QueryResult[];
    rows: Record<string, JsonValue>[];
  }[];
): Promise<void>;
```

!!! tip "Table Display Tips"
    - Results will replace any existing table data
    - Datasets are not paginated. Be aware of large datasets!

### getViewState

Get the current state of your view instance.

!!! tip "Learn more about View State [here](plugin-views.md#view-state)."

**Usage:**
```typescript
import { getViewState } from '@beekeeperstudio/plugin';
const state = await getViewState();
```

**Signature:**
```typescript
async function getViewState<T>(): Promise<T>;
```

### setViewState

Store state for your view instance.

!!! tip "Learn about more about View State [here](plugin-views.md#view-state)."

**Usage:**
```typescript
import { setViewState } from '@beekeeperstudio/plugin';
await setViewState({
  state: {
    selectedTable: 'users',
    filters: ['active = true']
  }
});
```

**Signature:**
```typescript
async function setViewState<T>(state: T): Promise<void>;
```

### getAppInfo

Get information about the application.

**Usage:**
```typescript
import { getAppInfo } from '@beekeeperstudio/plugin';
const appInfo = await getAppInfo();
```

**Signature:**
```typescript
async function getAppInfo(): Promise<{
  version: string;
  theme: {
    palette: Record<string, string>;
    cssString: string;
    type: "dark" | "light";
  };
}>;
```

### clipboard.writeText

Write text to the system clipboard.

**Usage:**
```typescript
import { clipboard } from '@beekeeperstudio/plugin';
await clipboard.writeText('Hello world!');
```

**Signature:**
```typescript
async function writeText(text: string): Promise<void>;
```

### clipboard.readText

Read text from the system clipboard.

**Usage:**
```typescript
import { clipboard } from '@beekeeperstudio/plugin';
const text = await clipboard.readText();
```

**Signature:**
```typescript
async function readText(): Promise<string>;
```

### broadcast.post

Broadcast a message to other views of your plugin.

**Usage:**
```typescript
import { broadcast } from '@beekeeperstudio/plugin';
broadcast.post("hello");
```

**Signature:**
```typescript
function post(message: JsonValue): Promise<void>;
```

### broadcast.on

Listen for messages from other views of your plugin.

**Usage:**
```typescript
import { broadcast } from '@beekeeperstudio/plugin';
broadcast.on((message) => {
  // Handle message here
});
```

**Signature:**
```typescript
function on(callback: (message: JsonValue) => void): void;
```

### checkForUpdate

Check for updates for your plugin.

**Usage:**
```typescript
import { checkForUpdate } from '@beekeeperstudio/plugin';
const updateAvailable = await checkForUpdate();
```

**Signature:**
```typescript
async function checkForUpdate(): Promise<boolean>;
```

## Notifications

### themeChanged

Fired when the application theme changes.

**Usage:**
```typescript
import { addNotificationListener } from '@beekeeperstudio/plugin';
addNotificationListener('themeChanged', (appTheme) => {
  // Apply new theme to your plugin
  styleTag.textContent = `:root { ${params.cssString} }`;
});
```

**Params schema:**

See [appTheme](#AppTheme)

### windowEvent

!!! info "Internal Use"
    This notification is primarily for internal use.

Fired for various window events.

**Usage:**
```typescript
import { addNotificationListener } from '@beekeeperstudio/plugin';
addNotificationListener('windowEvent', (params) => {
  if (params.eventType === 'resize') {
    // Handle window resize
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

### QueryResult

| Property | Type | Description |
|----------|------|-------------|
| `fields` | `{ id: string; name: string; dataType?: string }[]` | Array of field definitions |
| `rows`   | `object[]` | Array of result rows |

### AppTheme

| Property    | Type      | Description |
|-------------|-----------|-------------|
| `palette`   | `Record<string, string>` | Key-value pairs of color names and hex codes |
| `cssString` | `string`                 | Generated CSS rules for the theme |
| `type`      | `ThemeType`              | Defines whether the theme is light or dark |


### ThemeType

`"dark" | "light"`

### JsonValue

`string | number | boolean | null | Record<string, JsonValue> | JsonValue[]`
