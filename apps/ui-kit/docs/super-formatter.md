# Super Formatter

The Super Formatter is a specialized component for configuring and previewing SQL formatting options. It provides a comprehensive interface for managing formatter presets with customizable settings including indentation, case handling, and layout preferences.

## Basic Usage

```html
<bks-super-formatter></bks-super-formatter>
<script>
  const formatter = document.querySelector("bks-super-formatter");
  formatter.value = "SELECT * FROM users WHERE id=1";
  formatter.formatterDialect = "postgresql";
  formatter.canAddPresets = true;
  formatter.presets = [
    {
      id: 1,
      name: "Default",
      systemDefault: true,
      config: {
        tabWidth: 2,
        useTabs: false,
        keywordCase: "upper",
        dataTypeCase: "upper",
        functionCase: "upper",
        logicalOperatorNewline: "before",
        expressionWidth: 50,
        linesBetweenQueries: 1,
        denseOperators: false,
        newlineBeforeSemicolon: false
      }
    }
  ];
</script>
```

## Features

### Preset Management

The Super Formatter allows users to create, save, and manage multiple formatting presets:

```js
// Enable preset management
formatter.canAddPresets = true;

// Provide existing presets
formatter.presets = [
  {
    id: 1,
    name: "Default",
    systemDefault: true, // Cannot be deleted
    config: {
      tabWidth: 2,
      keywordCase: "upper",
      // ... other config options
    }
  },
  {
    id: 2,
    name: "Custom",
    systemDefault: false,
    config: {
      tabWidth: 4,
      keywordCase: "lower",
      // ... other config options
    }
  }
];

// Listen for preset operations
formatter.addEventListener("bks-create-preset", (event) => {
  const { name, config } = event.detail;
  // Save new preset to database
});

formatter.addEventListener("bks-save-preset", (event) => {
  const { id, config } = event.detail;
  // Update existing preset
});

formatter.addEventListener("bks-delete-preset", (event) => {
  const { id } = event.detail;
  // Delete preset from database
});
```

### Formatting Options

The component provides extensive formatting options:

#### Indentation
- **Tab Width**: Number of spaces per indentation level (1-20)
- **Use Tabs**: Toggle between spaces and tabs for indentation

#### Case Handling
- **Keyword Case**: Transform SQL keywords (preserve, upper, lower)
- **Data Type Case**: Transform data type names (preserve, upper, lower)
- **Function Case**: Transform function names (preserve, upper, lower)

#### Layout
- **Logical Operator Newline**: Place logical operators (AND, OR) on new lines
- **Expression Width**: Maximum character width for expressions (1-100)
- **Lines Between Queries**: Number of blank lines between separate queries (1-20)
- **Dense Operators**: Remove spacing around operators (e.g., `a=b` vs `a = b`)
- **Newline Before Semicolon**: Place semicolons on a new line

### Real-time Preview

The formatter provides a live preview of formatting changes:

```js
// Set SQL to format
formatter.value = "select id,name from users where active=true";

// Changes to formatting options automatically update the preview
// Preview shows formatted SQL: SELECT id, name FROM users WHERE active = true
```

### Apply and Copy

Users can apply the formatted SQL or copy it to clipboard:

```js
// Listen for apply event
formatter.addEventListener("bks-apply-preset", (event) => {
  const { config, id } = event.detail;
  // Apply the formatting configuration to the editor
});

// Copy to clipboard is handled internally
formatter.clipboard = {
  writeText: (text) => navigator.clipboard.writeText(text)
};
```

## Starting Configuration

You can initialize the formatter with a specific configuration:

```js
formatter.startingPreset = {
  id: 2, // Optional: ID of preset to select
  tabWidth: 4,
  useTabs: true,
  keywordCase: "upper",
  dataTypeCase: "upper",
  functionCase: "lower",
  logicalOperatorNewline: "before",
  expressionWidth: 80,
  linesBetweenQueries: 2,
  denseOperators: true,
  newlineBeforeSemicolon: false
};
```

## SQL Dialect Support

The formatter supports multiple SQL dialects via the `formatterDialect` property:

```js
// Set dialect for proper formatting
formatter.formatterDialect = "postgresql"; // or "mysql", "sqlite", "tsql", etc.
```

Supported dialects include:
- `sql` (generic SQL)
- `postgresql`
- `mysql`
- `sqlite`
- `tsql` (SQL Server)
- `plsql` (Oracle)
- `bigquery`
- And more...

## Events

The Super Formatter emits the following custom events:

### `bks-create-preset`
Fired when a new preset is created.
```js
formatter.addEventListener("bks-create-preset", (event) => {
  const { name, config } = event.detail;
  // name: string - Name of the new preset
  // config: FormatOptions - Formatting configuration
});
```

### `bks-save-preset`
Fired when an existing preset is saved.
```js
formatter.addEventListener("bks-save-preset", (event) => {
  const { id, config } = event.detail;
  // id: number - ID of the preset to update
  // config: FormatOptions - Updated formatting configuration
});
```

### `bks-delete-preset`
Fired when a preset is deleted.
```js
formatter.addEventListener("bks-delete-preset", (event) => {
  const { id } = event.detail;
  // id: number - ID of the preset to delete
});
```

### `bks-apply-preset`
Fired when the user clicks "Apply" to apply the formatting.
```js
formatter.addEventListener("bks-apply-preset", (event) => {
  const { config, id } = event.detail;
  // config: FormatOptions - Configuration to apply
  // id: number - ID of the preset being applied
});
```

## Complete Example

```html
<bks-super-formatter id="formatter"></bks-super-formatter>

<script>
  const formatter = document.getElementById("formatter");

  // Configure formatter
  formatter.value = "SELECT id, name, email FROM users WHERE active = true AND role = 'admin'";
  formatter.formatterDialect = "postgresql";
  formatter.canAddPresets = true;
  formatter.clipboard = {
    writeText: (text) => navigator.clipboard.writeText(text)
  };

  // Load presets from storage
  formatter.presets = [
    {
      id: 1,
      name: "Compact",
      systemDefault: true,
      config: {
        tabWidth: 2,
        useTabs: false,
        keywordCase: "lower",
        dataTypeCase: "lower",
        functionCase: "lower",
        logicalOperatorNewline: "before",
        expressionWidth: 50,
        linesBetweenQueries: 1,
        denseOperators: true,
        newlineBeforeSemicolon: false
      }
    },
    {
      id: 2,
      name: "Readable",
      systemDefault: false,
      config: {
        tabWidth: 4,
        useTabs: false,
        keywordCase: "upper",
        dataTypeCase: "upper",
        functionCase: "upper",
        logicalOperatorNewline: "before",
        expressionWidth: 80,
        linesBetweenQueries: 2,
        denseOperators: false,
        newlineBeforeSemicolon: false
      }
    }
  ];

  // Start with a specific preset
  formatter.startingPreset = {
    id: 2,
    ...formatter.presets[1].config
  };

  // Handle preset events
  formatter.addEventListener("bks-create-preset", async (event) => {
    const { name, config } = event.detail;
    const newPreset = await savePresetToDatabase(name, config);

    // Update presets list
    formatter.presets = [...formatter.presets, newPreset];
  });

  formatter.addEventListener("bks-save-preset", async (event) => {
    const { id, config } = event.detail;
    await updatePresetInDatabase(id, config);

    // Update presets list
    const presetIndex = formatter.presets.findIndex(p => p.id === id);
    formatter.presets[presetIndex].config = config;
    formatter.presets = [...formatter.presets];
  });

  formatter.addEventListener("bks-delete-preset", async (event) => {
    const { id } = event.detail;
    await deletePresetFromDatabase(id);

    // Update presets list
    formatter.presets = formatter.presets.filter(p => p.id !== id);
  });

  formatter.addEventListener("bks-apply-preset", (event) => {
    const { config } = event.detail;
    // Apply formatting to your SQL editor
    applyFormattingToEditor(config);
  });
</script>
```

## API

See the API reference below for more details.

- [Super Formatter API][super-formatter-api]

[super-formatter-api]: ./api/super-formatter.md
