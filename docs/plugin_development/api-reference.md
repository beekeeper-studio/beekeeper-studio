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

### getSchemas

Get a list of schemas from the current database.

**Usage:**
```typescript
import { getSchemas } from '@beekeeperstudio/plugin';
const schemas = await getSchemas();
```

**Example Response:**
```typescript
["public", "information_schema", "pg_catalog"]
```

**Signature:**
```typescript
async function getSchemas(): Promise<string[]>;
```

### getTables

Get a list of tables from the current database.

**Usage:**
```typescript
import { getTables } from '@beekeeperstudio/plugin';

// Get all tables
const tables = await getTables();

// Get tables from a specific schema
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

### getTableKeys

Get foreign key relationships for a specific table.

**Usage:**
```typescript
import { getTableKeys } from '@beekeeperstudio/plugin';
const keys = await getTableKeys('orders', 'public');
```

**Example Response:**
```typescript
[
  {
    isComposite: false,
    toTable: "users",
    toSchema: "public",
    toColumn: "id",
    fromTable: "orders",
    fromSchema: "public",
    fromColumn: "user_id",
    constraintName: "fk_orders_user_id",
    onUpdate: "CASCADE",
    onDelete: "SET NULL"
  }
]
```

**Signature:**
```typescript
async function getTableKeys(table: string, schema?: string): Promise<TableKey[]>;
```

### getPrimaryKeys

Get primary key information for a specific table.

**Usage:**
```typescript
import { getPrimaryKeys } from '@beekeeperstudio/plugin';
const primaryKeys = await getPrimaryKeys('users', 'public');
```

**Example Response:**
```typescript
[
  {
    columnName: "id",
    position: 1
  }
]
```

**Signature:**
```typescript
async function getPrimaryKeys(table: string, schema?: string): Promise<PrimaryKey[]>;
```

### getTableIndexes

Get index information for a specific table.

**Usage:**
```typescript
import { getTableIndexes } from '@beekeeperstudio/plugin';
const indexes = await getTableIndexes('users', 'public');
```

**Example Response:**
```typescript
[
  {
    id: "idx_users_email",
    table: "users",
    schema: "public",
    name: "idx_users_email",
    columns: [
      {
        name: "email",
        order: "ASC"
      }
    ],
    unique: true,
    primary: false
  }
]
```

**Signature:**
```typescript
async function getTableIndexes(table: string, schema?: string): Promise<TableIndex[]>;
```

### getIncomingKeys

Get incoming foreign key relationships (references to this table from other tables).

**Usage:**
```typescript
import { getIncomingKeys } from '@beekeeperstudio/plugin';
const incomingKeys = await getIncomingKeys('users', 'public');
```

**Signature:**
```typescript
async function getIncomingKeys(table: string, schema?: string): Promise<TableKey[]>;
```

### getOutgoingKeys

Get outgoing foreign key relationships (references from this table to other tables).

**Usage:**
```typescript
import { getOutgoingKeys } from '@beekeeperstudio/plugin';
const outgoingKeys = await getOutgoingKeys('orders', 'public');
```

**Signature:**
```typescript
async function getOutgoingKeys(table: string, schema?: string): Promise<TableKey[]>;
```

### runQuery

Execute a SQL query against the current database.

!!! warning "No Query Sanitization"
    The query will be executed exactly as provided with no modification or sanitization. Always validate and sanitize user input before including it in queries to prevent unwanted actions.

**Usage:**
```typescript
import { runQuery } from '@beekeeperstudio/plugin';
const result = await runQuery('SELECT * FROM users WHERE active = true LIMIT 10');
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
  connectionType: "postgresql",
  id: 1,
  workspaceId: 123,
  connectionName: "Production DB",
  databaseType: "postgresql",
  databaseName: "myapp_production",
  defaultSchema: "public",
  readOnlyMode: false
}
```

**Signature:**
```typescript
async function getConnectionInfo(): Promise<{
  connectionType: string;
  id: number;
  workspaceId: number;
  connectionName: string;
  databaseType: 'postgresql' | 'mysql' | 'mariadb' | 'sqlite' | 'sqlserver' | 'oracle' | 'mongodb' | 'cassandra' | 'clickhouse' | 'firebird' | 'bigquery' | 'redshift' | 'duckdb' | 'libsql' | 'redis' | 'surrealdb' | 'trino';
  databaseName: string;
  defaultSchema?: string;
  readOnlyMode: boolean;
}>;
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
| `redis` | Redis |
| `surrealdb` | SurrealDB |
| `trino` | Trino |

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

### getViewContext

Get the current view context.

A view context describes how this plugin view was opened and what data is available for it. It always includes the static `command` from your `manifest.json`, and may also include dynamic `params` depending on where the menu was invoked.

**Usage:**
```typescript
import { getViewContext } from '@beekeeperstudio/plugin';
const context = await getViewContext();
```

**Example Response:**
```typescript
{
  command: "analyze-data",
  params: {
    target: {
      type: "cell",
      row: 0,
      column: "email",
      value: "user@example.com"
    },
    activeRange: {
      rows: [0, 1, 2],
      columns: ["id", "email"],
      value: [
        [1, "user1@example.com"],
        [2, "user2@example.com"],
        [3, "user3@example.com"]
      ]
    }
  }
}
```

**Signature:**
```typescript
async function getViewContext(): Promise<PluginViewContext>;
```

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
  selectedTable: 'users',
  filters: ['active = true']
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

### getAppVersion

Get the version of Beekeeper Studio.

**Usage:**
```typescript
import { getAppVersion } from '@beekeeperstudio/plugin';
const version = await getAppVersion();
```

**Signature:**
```typescript
async function getAppVersion(): Promise<string>;
```

### openExternal

Open a URL in the default external browser.

**Usage:**
```typescript
import { openExternal } from '@beekeeperstudio/plugin';
await openExternal('https://example.com');
```

**Signature:**
```typescript
async function openExternal(link: string): Promise<void>;
```

### getData

Retrieve stored data by key.

**Usage:**
```typescript
import { getData } from '@beekeeperstudio/plugin';

// Get data with custom key
const data = await getData('myKey');

// Get data with default key
const data = await getData();
```

**Signature:**
```typescript
async function getData<T = unknown>(key?: string): Promise<T>;
```

### setData

Store data that can be retrieved later.

**Usage:**
```typescript
import { setData } from '@beekeeperstudio/plugin';

// Store with custom key
await setData('myKey', { name: 'John' });

// Store with default key
await setData({ name: 'John' });
```

**Signature:**
```typescript
async function setData<T = unknown>(key: string, value: T): Promise<void>;
async function setData<T = unknown>(value: T): Promise<void>;
```

### getEncryptedData

Retrieve encrypted stored data by key.

**Usage:**
```typescript
import { getEncryptedData } from '@beekeeperstudio/plugin';
const secretData = await getEncryptedData('secretKey');
```

**Signature:**
```typescript
async function getEncryptedData<T>(key: string): Promise<T>;
```

### setEncryptedData

Store encrypted data that can be retrieved later.

**Usage:**
```typescript
import { setEncryptedData } from '@beekeeperstudio/plugin';

// Store with custom key
await setEncryptedData('secretKey', { token: 'abc123' });

// Store with default key
await setEncryptedData({ token: 'abc123' });
```

**Signature:**
```typescript
async function setEncryptedData<T = unknown>(key: string, value: T): Promise<void>;
async function setEncryptedData<T = unknown>(value: T): Promise<void>;
```

### openTab

Open different types of tabs in Beekeeper Studio.

**Usage:**
```typescript
import { openTab } from '@beekeeperstudio/plugin';

// Open a query tab
await openTab('query', { query: 'SELECT * FROM users' });

// Open a table data tab
await openTab('tableTable', {
  table: 'users',
  schema: 'public',
  filters: [
    { field: 'active', type: '=', value: 'true' }
  ]
});

// Open a table structure tab
await openTab('tableStructure', {
  table: 'users',
  schema: 'public'
});
```

**Signature:**
```typescript
async function openTab(type: "query", options?: OpenQueryTabOptions): Promise<void>;
async function openTab(type: "tableTable", options: OpenTableTableTabOptions): Promise<void>;
async function openTab(type: "tableStructure", options: OpenTableStructureTabOptions): Promise<void>;
```

### requestFileSave

Request a file save dialog to save data to the user's filesystem.

**Usage:**
```typescript
import { requestFileSave } from '@beekeeperstudio/plugin';
await requestFileSave({
  data: 'SELECT * FROM users',
  fileName: 'query.sql',
  filters: [
    { name: 'SQL Files', extensions: ['sql'] },
    { name: 'All Files', extensions: ['*'] }
  ]
});

// Save binary data (base64 encoded)
await requestFileSave({
  data: base64ImageData,
  fileName: 'chart.png',
  encoding: 'base64',
  filters: [
    { name: 'PNG Images', extensions: ['png'] }
  ]
});
```

**Signature:**
```typescript
async function requestFileSave(options: RequestFileSaveOptions): Promise<void>;
```

### showStatusBarUI

Show the status bar UI for your plugin.

**Usage:**
```typescript
import { showStatusBarUI } from '@beekeeperstudio/plugin';
await showStatusBarUI();
```

**Signature:**
```typescript
async function showStatusBarUI(): Promise<void>;
```

### hideStatusBarUI

Hide the status bar UI for your plugin.

**Usage:**
```typescript
import { hideStatusBarUI } from '@beekeeperstudio/plugin';
await hideStatusBarUI();
```

**Signature:**
```typescript
async function hideStatusBarUI(): Promise<void>;
```

### toggleStatusBarUI

Toggle the status bar UI visibility for your plugin.

**Usage:**
```typescript
import { toggleStatusBarUI } from '@beekeeperstudio/plugin';
await toggleStatusBarUI();
```

**Signature:**
```typescript
async function toggleStatusBarUI(): Promise<void>;
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

### clipboard.writeImage

Write an image to the system clipboard.

**Usage:**
```typescript
import { clipboard } from '@beekeeperstudio/plugin';

// data should be a base64 encoded image string
await clipboard.writeImage(base64ImageData);
```

**Signature:**
```typescript
async function writeImage(data: string): Promise<void>;
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

Notifications are events that are emitted by Beekeeper Studio to inform your plugin about changes in the application state. Use `addNotificationListener` to subscribe to these events and `removeNotificationListener` to unsubscribe.

### tablesChanged

Fired when tables in the current database have changed (e.g., after a table is created, dropped, or modified).

**Usage:**
```typescript
import { addNotificationListener } from '@beekeeperstudio/plugin';
addNotificationListener('tablesChanged', () => {
  // Refresh your table list or update UI
  console.log('Tables have changed, refreshing...');
});
```

**Signature:**
```typescript
function addNotificationListener(name: "tablesChanged", handler: () => void): void;
```

### broadcast

Fired when another view of your plugin sends a broadcast message.

!!! tip
    This is automatically handled when using `broadcast.on()`. You typically don't need to use this directly.

**Usage:**
```typescript
import { addNotificationListener } from '@beekeeperstudio/plugin';
addNotificationListener('broadcast', ({ message }) => {
  // Handle broadcast message
  console.log('Received broadcast:', message);
});
```

**Signature:**
```typescript
function addNotificationListener<Message extends JsonValue = JsonValue>(
  name: "broadcast",
  handler: (args: { message: Message }) => void
): void;
```

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

## Removing Notification Listeners

Use `removeNotificationListener` to unsubscribe from events.

**Usage:**
```typescript
import { addNotificationListener, removeNotificationListener } from '@beekeeperstudio/plugin';

const handler = () => {
  console.log('Tables changed');
};

// Subscribe
addNotificationListener('tablesChanged', handler);

// Unsubscribe
removeNotificationListener('tablesChanged', handler);
```

**Signature:**
```typescript
function removeNotificationListener(name: "tablesChanged", handler: (args: any) => void): void;
function removeNotificationListener<Message extends JsonValue = JsonValue>(name: "broadcast", handler: (args: any) => void): void;
function removeNotificationListener(name: "themeChanged", handler: (args: any) => void): void;
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
| `schema`     | `string` | Schema name (optional) |

### TableKey

Foreign key relationship information.

| Property         | Type                  | Description |
|------------------|-----------------------|-------------|
| `isComposite`    | `boolean`            | Whether the key involves multiple columns |
| `toTable`        | `string`             | Target table name |
| `toSchema`       | `string`             | Target schema name |
| `toColumn`       | `string \| string[]` | Target column(s) |
| `fromTable`      | `string`             | Source table name |
| `fromSchema`     | `string`             | Source schema name |
| `fromColumn`     | `string \| string[]` | Source column(s) |
| `constraintName` | `string`             | Constraint name (optional) |
| `onUpdate`       | `string`             | ON UPDATE action (optional) |
| `onDelete`       | `string`             | ON DELETE action (optional) |

### PrimaryKey

| Property     | Type     | Description |
|--------------|----------|-------------|
| `columnName` | `string` | Column name |
| `position`   | `number` | Position in composite primary key |

### TableIndex

| Property           | Type            | Description |
|--------------------|-----------------|-------------|
| `id`               | `string`        | Index identifier |
| `table`            | `string`        | Table name |
| `schema`           | `string`        | Schema name |
| `name`             | `string`        | Index name |
| `columns`          | `IndexColumn[]` | Array of index columns |
| `unique`           | `boolean`       | Whether the index enforces uniqueness |
| `primary`          | `boolean`       | Whether this is a primary key index |
| `nullsNotDistinct` | `boolean`       | For PostgreSQL 15+: whether nulls are treated as distinct (optional) |

### IndexColumn

| Property | Type     | Description |
|----------|----------|-------------|
| `name`   | `string` | Column name |
| `order`  | `'ASC' \| 'DESC' \| '2d' \| '2dsphere' \| 'text' \| 'geoHaystack' \| 'hashed' \| number` | Sort order (optional) |
| `prefix` | `number \| null` | MySQL only: index prefix length (optional) |

### QueryResult

| Property | Type | Description |
|----------|------|-------------|
| `fields` | `{ id: string; name: string; dataType?: string }[]` | Array of field definitions |
| `rows`   | `object[]` | Array of result rows |

### ConnectionInfo

| Property         | Type     | Description |
|------------------|----------|-------------|
| `connectionType` | `string` | Alias for databaseType |
| `id`             | `number` | Connection ID |
| `workspaceId`    | `number` | Workspace ID |
| `connectionName` | `string` | Name specified in connection form |
| `databaseType`   | `DatabaseType` | Type of database |
| `databaseName`   | `string` | Name of the database |
| `defaultSchema`  | `string` | Default schema (optional) |
| `readOnlyMode`   | `boolean` | Whether connection is read-only |

### PluginViewContext

Context information for how a plugin view was opened.

| Property  | Type                    | Description |
|-----------|-------------------------|-------------|
| `command` | `string`               | The command from manifest.json |
| `params`  | `LoadViewParams`       | Context-specific parameters (optional) |

### CellMenuParams

Parameters when a cell context menu is triggered.

| Property      | Type            | Description |
|---------------|-----------------|-------------|
| `target`      | `CellMenuTarget` | Information about the clicked cell |
| `activeRange` | `ActiveRange`   | Currently selected range |

### ColumnMenuParams

Parameters when a column header context menu is triggered.

| Property      | Type              | Description |
|---------------|-------------------|-------------|
| `target`      | `ColumnMenuTarget` | Information about the clicked column |
| `activeRange` | `ActiveRange`     | Currently selected range |

### RowMenuParams

Parameters when a row header context menu is triggered.

| Property      | Type           | Description |
|---------------|----------------|-------------|
| `target`      | `RowMenuTarget` | Information about the clicked row |
| `activeRange` | `ActiveRange`  | Currently selected range |

### CornerMenuParams

Parameters when the corner (top-left) context menu is triggered.

| Property      | Type             | Description |
|---------------|------------------|-------------|
| `target`      | `CornerMenuTarget` | Information about the selection |
| `activeRange` | `ActiveRange`    | Currently selected range |

### ActiveRange

Represents the currently selected range in a data table.

| Property  | Type         | Description |
|-----------|--------------|-------------|
| `rows`    | `number[]`   | Array of selected row indices |
| `columns` | `string[]`   | Array of selected column names |
| `value`   | `JsonValue[][]` | 2D array of selected values |

### OpenQueryTabOptions

| Property | Type     | Description |
|----------|----------|-------------|
| `query`  | `string` | SQL query to populate (optional) |

### OpenTableTableTabOptions

| Property   | Type            | Description |
|------------|-----------------|-------------|
| `table`    | `string`        | Table name |
| `schema`   | `string`        | Schema name (optional) |
| `filters`  | `TableFilter[]` | Filters to apply (optional) |
| `database` | `string`        | Database name (optional) |

### OpenTableStructureTabOptions

| Property   | Type     | Description |
|------------|----------|-------------|
| `table`    | `string` | Table name |
| `schema`   | `string` | Schema name (optional) |
| `database` | `string` | Database name (optional) |

### TableFilter

| Property | Type     | Description |
|----------|----------|-------------|
| `field`  | `string` | Column name to filter |
| `type`   | `'=' \| '!=' \| 'like' \| 'not like' \| '<' \| '<=' \| '>' \| '>=' \| 'in' \| 'is' \| 'is not'` | Filter operator |
| `value`  | `string \| string[]` | Filter value(s) (optional) |
| `op`     | `'AND' \| 'OR'` | Logical operator (optional) |

### RequestFileSaveOptions

| Property   | Type     | Description |
|------------|----------|-------------|
| `data`     | `string` | Data to save |
| `fileName` | `string` | Default file name |
| `encoding` | `'utf8' \| 'base64'` | Data encoding (default: "utf8") |
| `filters`  | `{ name: string; extensions: string[] }[]` | File type filters (optional) |

### AppTheme

| Property    | Type      | Description |
|-------------|-----------|-------------|
| `palette`   | `Record<string, string>` | Key-value pairs of color names and hex codes |
| `cssString` | `string`                 | Generated CSS rules for the theme |
| `type`      | `ThemeType`              | Defines whether the theme is light or dark |

### DatabaseType

Union of supported database types:

`'postgresql' | 'mysql' | 'mariadb' | 'sqlite' | 'sqlserver' | 'oracle' | 'mongodb' | 'cassandra' | 'clickhouse' | 'firebird' | 'bigquery' | 'redshift' | 'duckdb' | 'libsql' | 'redis' | 'surrealdb' | 'trino'`

### ThemeType

`"dark" | "light"`

### JsonValue

`string | number | boolean | null | Record<string, JsonValue> | JsonValue[]`
