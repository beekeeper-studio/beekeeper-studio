# @bks/ui-kit

## Overview

The `@bks/ui-kit` library provides a set of reusable custom elements used in Beekeeper Studio, such as:

- **Table**: A custom element for displaying tabular data.
- **Table List**: A custom element for displaying a list of table items.
- **SQL Text Editor**: A custom element for editing SQL queries with syntax highlighting and auto-completion.
- **Data Editor**: A custom element that provides all of the above in one place.

## Table of Contents

- [Overview](#overview)
- [Table of Contents](#table-of-contents)
- [Installation](#installation)
- [Components](#components)
  - [Table](#table)
    - [Example](#example)
    - [Properties](#properties)
    - [Column Definition](#column-definition)
    - [Context Menu Item](#context-menu-item)
    - [Methods](#methods)
    - [Events](#events)
  - [Table List](#table-list)
    - [Example](#example-1)
    - [Properties](#properties-1)
    - [Table Definition](#table-definition)
    - [Events](#events-1)
  - [SQL Text Editor](#sql-text-editor)
    - [Example](#example-2)
    - [Properties](#properties-2)
    - [Events](#events-2)
  - [Data Editor](#data-editor)
    - [Example](#example-3)
    - [Properties](#properties-3)
    - [Methods](#methods-2)
    - [Events](#events-3)
- [NOTE](#note)

## Installation

To load the `@bks/ui-kit` library in your project, follow these steps:

1. Install the library using npm or yarn:

   ```bash
   npm install @bks/ui-kit
   ```

2. Import the desired component and the style:

   ```js
   // Import components individually
   import "@bks/ui-kit/bks-table.js";
   import "@bks/ui-kit/bks-table-list.js";
   import "@bks/ui-kit/bks-sql-text-editor.js";
   import "@bks/ui-kit/bks-data-editor.js";

   // or import the whole library
   import "@bks/ui-kit";
   import "@bks/ui-kit/style.css";
   ```

3. Use the component in your HTML code:

   ```html
   <bks-table></bks-table>
   <bks-table-list></bks-table-list>
   <bks-sql-text-editor></bks-sql-text-editor>
   <bks-data-editor></bks-data-editor>
   ```

## Components

### Table

#### Example

```html
<bks-table></bks-table>

<script>
  const table = document.querySelector("bks-table");
  table.data = [
    { id: 1, name: "John Doe" },
    { id: 2, name: "Jane Smith" },
  ];
  table.columns = [{ field: "id" }, { field: "name" }];
</script>
```

#### Properties

| Name                           | Type                     | Description                                                                                                          | Default     |
| ------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------- | ----------- |
| `name`                         | `string`                 | The name of the table.                                                                                               | `table`     |
| `data`                         | `object[]`               | An array of objects representing the table data.                                                                     | `[]`        |
| `columns`                      | `object[]`               | An array of objects representing the table columns.                                                                  | `[]`        |
| `tabulatorOptions`             | `object`                 | Extend the tabulator definition. See [tabulator docs](https://tabulator.info/docs/6.3/options) for more information. | `undefined` |
| `cellContextMenuItems`         | `object[]` \| `function` | Extend the cell context menu items.                                                                                  | `undefined` |
| `rowContextMenuItems`          | `object[]` \| `function` | Extend the row context menu items.                                                                                   | `undefined` |
| `columnHeaderContextMenuItems` | `object[]` \| `function` | Extend the column header context menu items.                                                                         | `undefined` |
| `rowHeaderContextMenuItems`    | `object[]` \| `function` | Extend the row header context menu items.                                                                            | `undefined` |
| `cornerHeaderContextMenuItems` | `object[]` \| `function` | Extend the corner header context menu items.                                                                         | `undefined` |

#### Column Definition

| Name                        | Type                   | Description                                                                                                                                                                          | Default     |
| --------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `field`<sup>required</sup>  | `string`               | The key of the column in the data array.                                                                                                                                             |             |
| `title`                     | `string`               | The title of the column displayed in the table header. If not provided, the `field` will be used.                                                                                    | `undefined` |
| `editable`                  | `boolean`              | Make the column editable.                                                                                                                                                            | `false`     |
| `dataType`                  | `string`               | The data type of the column.                                                                                                                                                         | `undefined` |
| `cssClass`                  | `string`               | The CSS class to apply to the column.                                                                                                                                                | `undefined` |
| `sorter`                    | `string` \| `'none'`   | The sorter to use for the column. Use `none` to disable sorting. Also see the [built-in sorters](https://tabulator.info/docs/6.3/sort#func-builtin) from tabulator for more options. | `undefined` |
| `primaryKey`                | `boolean`              | Make the column a primary key. If `true`, the column header will indicate that it is a primary key.                                                                                  | `undefined` |
| `foreignKey`                | `boolean`              | Similar to `primaryKey`.                                                                                                                                                             | `undefined` |
| `generated`                 | `boolean`              | Similar to `primaryKey`.                                                                                                                                                             | `undefined` |
| `tabulatorColumnDefinition` | `object` \| `function` | Extend the tabulator column definition. See [tabulator docs](https://tabulator.info/docs/6.3/columns#definition) for more information.                                               | `undefined` |

#### Context Menu Item

| Name                         | Type         | Description                                                      | Default     |
| ---------------------------- | ------------ | ---------------------------------------------------------------- | ----------- |
| `name`<sup>required</sup>    | `string`     | The name of the context menu item.                               |             |
| `handler`<sup>required</sup> | `function`   | The handler function to be called when the item is clicked.      |             |
| `slug`                       | `string`     | The slug of the context menu item.                               | `undefined` |
| `class`                      | `string`     | The CSS class to apply to the context menu item.                 | `undefined` |
| `shortcut`                   | `string`     | The shortcut key to trigger the context menu item.               | `undefined` |
| `icon`                       | `string`     | The material icon name to display next to the context menu item. | `undefined` |
| `disabled`                   | `boolean`    | Disable the context menu item.                                   | `false`     |
| `items`                      | `MenuItem[]` | An array of sub-items.                                           | `undefined` |

If you want to add a divider between context menu items, you can add an object `{ type: "divider" }`.

#### Methods

| Name             | Description                                                                                                        | Arguments |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ | --------- |
| `getTabulator()` | Returns the Tabulator instance. See [tabulator docs](https://tabulator.info/docs/6.3/update) for more information. | -         |

#### Events

| Name                    | Description                                                                           | Event Detail                                             |
| ----------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `bks-initialized`       | Emitted when the Table is initialized.                                                | `[Tabulator]`                                            |
| `bks-sorters-change`    | Emitted when the sorters are changed.                                                 | `[{ field: string, dir: 'asc' \| 'desc' }]`              |
| `bks-ranges-change`     | [FIXME doesnt work sometimes. fix from tabulator]Emitted when the ranges are changed. | `[TabulatorRange[]]`                                     |
| `bks-foreign-key-go-to` | Emitted when the foreign key go to button is clicked.                                 | `[{ value: any; field: string; cell: CellCommponent; }]` |

### Table List

#### Example

```html
<bks-table-list></bks-table-list>
<script>
  const tableList = document.querySelector("bks-table-list");
  tableList.tables = [
    {
      name: "users",
      schema: "public",
      columns: [
        { field: "id", dataType: "integer" },
        { field: "name", dataType: "string" },
      ],
    },
  ];
</script>
```

#### Properties

| Name                      | Type                     | Description                                  | Default     |
| ------------------------- | ------------------------ | -------------------------------------------- | ----------- |
| `tables`                  | `object[]`               | An array of objects representing the tables. | `[]`        |
| `schemaContextMenuItems`  | `object[]` \| `function` | Extend the schema context menu items.        | `undefined` |
| `tableContextMenuItems`   | `object[]` \| `function` | Extend the table context menu items.         | `undefined` |
| `routineContextMenuItems` | `object[]` \| `function` | Extend the routine context menu items.       | `undefined` |

#### Table Definition

| Name                      | Type                                    | Description                                         | Default     |
| ------------------------- | --------------------------------------- | --------------------------------------------------- | ----------- |
| `name`<sup>required</sup> | `string`                                | The name of the table.                              |             |
| `schema`                  | `string`                                | The schema of the table.                            | `undefined` |
| `columns`                 | `{ field: string; dataType: string }[]` | An array of objects representing the table columns. | `undefined` |

#### Events

| Name                      | Description                                                                  | Event Detail |
| ------------------------- | ---------------------------------------------------------------------------- | ------------ |
| `bks-item-expand`         | Emitted when an item is expanded.                                            | `[object]`   |
| `bks-item-collaps`        | Emitted when an item is collapsed.                                           | `[object]`   |
| `bks-item-dblclick`       | Emitted when an item is double-clicked.                                      | `[object]`   |
| `bks-item-contextmenu`    | Emitted when an item is right-clicked.                                       | `[object]`   |
| `bks-item-update-columns` | Emitted when an item requests columns update. This is used for lazy loading. | `[object]`   |
| `bks-expand-all`          | Emitted when all items are expanded.                                         | -            |
| `bks-collapse-all`        | Emitted when all items are collapsed.                                        | -            |
| `bks-add-btn-click`       | Emitted when the add button is clicked.                                      | `[object]`   |
| `bks-refresh-btn-click`   | Emitted when the refresh button is clicked.                                  | `[object]`   |

### SQL Text Editor

#### Example

```html
<bks-sql-text-editor></bks-sql-text-editor>
<script>
  const sqlTextEditor = document.querySelector("bks-sql-text-editor");
  sqlTextEditor.tables = [
    {
      name: "users",
      schema: "public",
      columns: [
        { field: "id", dataType: "integer" },
        { field: "name", dataType: "string" },
      ],
    },
  ];
  sqlTextEditor.value = "SELECT * FROM users";
</script>
```

#### Properties

| Name                | Type                  | Description                                                                                                                                                                                                                          | Default     |
| ------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `value`             | `string`              | The SQL query to display.                                                                                                                                                                                                            | `''`        |
| `tables`            | `object[]`            | An array of table names to autocomplete. The format is the same as the `tables` property of the `bks-table-list` component.                                                                                                          | `[]`        |
| `readOnly`          | `boolean` \| `string` | Disable editing. If "nocursor" is provided, focusing the editor is also disabled.                                                                                                                                                    | `false`     |
| `markers`           | `object[]`            | An array of objects representing the markers.                                                                                                                                                                                        | `[]`        |
| `formatterDialect`  | `string`              | The SQL dialect to use for formatting. See sql-formatter's [language](https://github.com/sql-formatter-org/sql-formatter/blob/master/docs/language.md) for possible options.                                                         | `'sql'`     |
| `identifierDialect` | `string`              | The SQL dialect to use for identifier quoting. See sql-query-identifier [API](https://github.com/coresql/sql-query-identifier?tab=readme-ov-file#api) for possible options.                                                          | `'generic'` |
| `keybindings`       | `object`              | Object contiaining keybindings where the key is a combination of keys and the value is a function. For example, `{ 'Ctrl-Enter': function submit(){}, 'Cmd-Enter': function submit(){} }`.                                           | `undefined` |
| `keymap`            | `string`              | Configure the keymap to use. Possible values are 'default', 'vim', 'emacs' and 'sublime'.                                                                                                                                            | `default`   |
| `vimConfig`         | `object`              | Configure vim mode.                                                                                                                                                                                                                  | `undefined` |
| `columnsGetter`     | `function`            | If provided, this function will be called for autocompleting column names instead of using the `tables.columns` property. Expect one argument of type `string` representing a combination of schema name (if exists) and table name. | `undefined` |
| `defaultSchema`     | `string`              | The default schema to use when autocompleting table names. Schemas that match this will be prioritized in the autocompletion list.                                                                                                   | `public`    |

#### Events

| Name               | Description                                      | Event Detail   |
| ------------------ | ------------------------------------------------ | -------------- |
| `bks-value-change` | Emitted when the SQL query is changed.           | `[string]`     |
| `bks-initialized`  | Emitted when the SQL text editor is initialized. | `[CodeMirror]` |
| `bks-focus`        | Emitted when the SQL text editor is focused.     | -              |
| `bks-blur`         | Emitted when the SQL text editor is blurred.     | -              |

### Data Editor

#### Example

```html
<bks-data-editor></bks-data-editor>
<script>
  const dataEditor = document.querySelector("bks-data-editor");
  dataEditor.tables = [
    {
      name: "users",
      columns: [
        { field: "id", dataType: "integer" },
        { field: "name", dataType: "varchar" },
      ],
      data: [
        { id: 1, name: "John Doe" },
        { id: 2, name: "Jane Smith" },
      ],
    },
  ];
  dataEditor.addEventListener("bks-query-submit", () => {
    dataEditor.setTable({
      name: "result",
      columns: [
        { field: "uuid", dataType: "varchar" },
        { field: "name", dataType: "varchar" },
        { field: "email", dataType: "varchar" },
      ],
      data: [
        { uuid: "123-456-789", name: "John Doe", email: "H0T4h@example.com" },
      ],
    });
  });
</script>
```

#### Properties

| Name                 | Type       | Description                                              | Default |
| -------------------- | ---------- | -------------------------------------------------------- | ------- |
| `tables`             | `object[]` | An array of objects representing the tables.             | `[]`    |
| `tableListProps`     | `object`   | An object containing default table list properties.      | `{}`    |
| `sqlTextEditorProps` | `object`   | An object containing default SQL text editor properties. | `{}`    |
| `tableProps`         | `object`   | An object containing default table properties.           | `{}`    |

#### Methods

| Name         | Description          | Arguments |
| ------------ | -------------------- | --------- |
| `setTable()` | Sets the table data. | `Table`   |

#### Events

All events from `bks-table`, `bks-table-list` and `bks-sql-text-editor` are available. In addition, the following events are emitted:

| Name               | Description                          | Event Detail |
| ------------------ | ------------------------------------ | ------------ |
| `bks-query-submit` | Emitted when the query is submitted. | `[string]`   |

## NOTE

When the custom element is removed from the document, the Vue component behaves just as if it's inside a <keep-alive> and its deactivated hook will be called. When it's inserted again, the activated hook will be called.

If you wish to destroy the inner component, you'd have to do that explicitly:

```js
document.querySelector("bks-table").vueComponent.$destroy();
```

Hey, you've reached the end of the README! Check out our recipes for more guidance: [recipes](docs/recipes.md).
