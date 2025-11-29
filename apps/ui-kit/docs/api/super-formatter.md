# Super Formatter API

For examples and usage details, visit the [Super Formatter][super-formatter] page.

## Properties

| Name               | Type                     | Description                                                                                                                                       | Default                  | Status |
| ------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------ |
| `value`            | `string`                 | The SQL text to format and preview.                                                                                                               | `''`  | ✅     |                   |
| `canAddPresets`    | `boolean`                | Enable preset management features (add, save, delete). When `false`, only formatting controls are shown.    | false | ✅     |                                      | `false`                  |
| `clipboard`         | `Clipboard`                                               | Custom clipboard handler for the editor used in vim. If provided, it must implement a `write` method to copy text to the clipboard. See [MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard) for more details. | `undefined` | ✅     |
| `startingPreset`   | `FormatOptions`          | Initial formatting configuration to load. Can include an optional `id` property to select a specific preset.                                      | See below                | ✅     | 
| `presets`          | `Preset[]`               | Array of available formatting presets. See [Preset Object](#preset-object) below.                                                                 | `[] | ✅     |`                     |
| `formatterDialect` | `string`                 | SQL dialect for formatting. See [sql-formatter's language](https://github.com/sql-formatter-org/sql-formatter/blob/master/docs/language.md) docs. | `'sql'`                  | ✅     |

### Default Starting Preset

```typescript
{
  id: null,
  tabWidth: 2,
  useTabs: false,
  keywordCase: 'preserve',
  dataTypeCase: 'preserve',
  functionCase: 'preserve',
  logicalOperatorNewline: 'before',
  expressionWidth: 50,
  linesBetweenQueries: 1,
  denseOperators: false,
  newlineBeforeSemicolon: false
}
```

## Types

### Preset Object

| Property        | Type           | Description                                                                | Required |
| --------------- | -------------- | -------------------------------------------------------------------------- | -------- |
| `id`            | `number`       | Unique identifier for the preset.                                          | ✅       |
| `name`          | `string`       | Display name for the preset.                                               | ✅       |
| `systemDefault` | `boolean`      | Whether this is a system preset (cannot be deleted).                       | ✅       |
| `config`        | `FormatOptions`| Formatting configuration. See [Format Options](#format-options) below.     | ✅       |

### Format Options

Configuration object for SQL formatting behavior.

| Property                  | Type                            | Description                                                                                        | Default     |
| ------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- | ----------- |
| `id`                      | `number` \| `null`              | Optional preset ID reference.                                                                      | `null`      |
| `tabWidth`                | `number`                        | Number of spaces per indentation level (1-20).                                                     | `2`         |
| `useTabs`                 | `boolean`                       | Use tab characters instead of spaces for indentation.                                              | `false`     |
| `keywordCase`             | `'preserve'` \| `'upper'` \| `'lower'` | Text case transformation for SQL keywords (SELECT, FROM, WHERE, etc.).                       | `'preserve'`|
| `dataTypeCase`            | `'preserve'` \| `'upper'` \| `'lower'` | Text case transformation for data type names (VARCHAR, INTEGER, etc.).                       | `'preserve'`|
| `functionCase`            | `'preserve'` \| `'upper'` \| `'lower'` | Text case transformation for function names (COUNT, SUM, NOW, etc.).                         | `'preserve'`|
| `logicalOperatorNewline`  | `'before'` \| `'after'`         | Placement of logical operators (AND, OR) relative to new lines.                                    | `'before'`  |
| `expressionWidth`         | `number`                        | Maximum character width for expressions before wrapping (1-100).                                   | `50`        |
| `linesBetweenQueries`     | `number`                        | Number of blank lines to insert between separate SQL queries (1-20).                               | `1`         |
| `denseOperators`          | `boolean`                       | Remove spaces around operators (e.g., `a=b` instead of `a = b`).                                   | `false`     |
| `newlineBeforeSemicolon`  | `boolean`                       | Place statement-ending semicolons on their own line.                                               | `false`     |

## Events

| Name                  | Description                                            | Event Detail                           |
| --------------------- | ------------------------------------------------------ | -------------------------------------- |
| `bks-create-preset`   | Emitted when a new preset is created.                  | `{ name: string, config: FormatOptions }` |
| `bks-save-preset`     | Emitted when an existing preset is saved.              | `{ id: number, config: FormatOptions }` |
| `bks-delete-preset`   | Emitted when a preset is deleted.                      | `{ id: number }`                       |
| `bks-apply-preset`    | Emitted when the user applies formatting.              | `{ config: FormatOptions, id: number }` |

## Event Examples

### Creating a New Preset

```javascript
formatter.addEventListener('bks-create-preset', (event) => {
  const { name, config } = event.detail;
  console.log(`Creating preset "${name}" with config:`, config);

  // Save to database and update presets list
  const newPreset = {
    id: generateId(),
    name: name,
    systemDefault: false,
    config: config
  };

  formatter.presets = [...formatter.presets, newPreset];
});
```

### Saving an Existing Preset

```javascript
formatter.addEventListener('bks-save-preset', (event) => {
  const { id, config } = event.detail;
  console.log(`Saving preset ${id} with config:`, config);

  // Update in database
  const presetIndex = formatter.presets.findIndex(p => p.id === id);
  if (presetIndex !== -1) {
    formatter.presets[presetIndex].config = config;
    formatter.presets = [...formatter.presets]; // Trigger reactivity
  }
});
```

### Deleting a Preset

```javascript
formatter.addEventListener('bks-delete-preset', (event) => {
  const { id } = event.detail;
  console.log(`Deleting preset ${id}`);

  // Remove from database
  formatter.presets = formatter.presets.filter(p => p.id !== id);
});
```

### Applying Formatting

```javascript
formatter.addEventListener('bks-apply-preset', (event) => {
  const { config, id } = event.detail;
  console.log(`Applying preset ${id}:`, config);

  // Apply the configuration to your SQL editor
  sqlEditor.formatOptions = config;
  sqlEditor.format();
});
```

## Supported SQL Dialects

The `formatterDialect` property accepts the following values:

- `sql` - Generic SQL (default)
- `bigquery` - Google BigQuery
- `db2` - IBM DB2
- `db2i` - IBM DB2 for i
- `hive` - Apache Hive
- `mariadb` - MariaDB
- `mysql` - MySQL
- `n1ql` - Couchbase N1QL
- `plsql` - Oracle PL/SQL
- `postgresql` - PostgreSQL
- `redshift` - Amazon Redshift
- `singlestoredb` - SingleStore
- `snowflake` - Snowflake
- `spark` - Apache Spark
- `sqlite` - SQLite
- `tidb` - TiDB
- `transactsql` / `tsql` - SQL Server T-SQL
- `trino` - Trino

## Usage Tips

### Preset Management Best Practices

1. **System Defaults**: Mark built-in presets with `systemDefault: true` to prevent deletion.
2. **Preset IDs**: Use unique, stable IDs (typically from database) to track presets across sessions.
3. **Event Handling**: Always update the `presets` array after create/save/delete operations to keep UI in sync.

### Clipboard Integration

```javascript
// Using native Clipboard API
formatter.clipboard = {
  writeText: (text) => navigator.clipboard.writeText(text)
};

// Custom clipboard handler
formatter.clipboard = {
  writeText: (text) => {
    // Custom implementation (e.g., Electron clipboard)
    myClipboard.write(text);
  }
};
```

### Dynamic Dialect Selection

```javascript
// Update dialect based on database connection
const dialectMap = {
  'postgres': 'postgresql',
  'mysql': 'mysql',
  'mssql': 'tsql',
  'oracle': 'plsql'
};

formatter.formatterDialect = dialectMap[currentConnection.type] || 'sql';
```

[super-formatter]: ../super-formatter.md
