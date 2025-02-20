# SQL Text Editor

A component for editing SQL queries with syntax highlighting and auto-completion.

## Basic Usage

[TODO]

```html
<bks-sql-text-editor></bks-sql-text-editor>
<script>
  const sqlTextEditor = document.querySelector("bks-sql-text-editor");
  sqlTextEditor.entities = [
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
## Value

[TODO]
reactive, handle the value manually.

```js
let value = "";
sqlTextEditor.value = value;
sqlTextEditor.addEventListener("bks-value-change", (event) => {
  value = event.detail.value;
});
```

## Autocompletion

[TODO]
use entities

```js
sqlTextEditor.entities = [
  {
    name: "users",
    schema: "public",
    columns: [
      { field: "id", dataType: "integer" },
      { field: "name", dataType: "string" },
    ],
  },
];
```

## Context Menu

More info on how to modify the context menu can be found in
[Context Menu][context-menu] and the [SQL Text Editor API][sql-text-editor-list-api] docs.

## API

See the API reference below for more details.

- [SQL Text Editor Component API][sql-text-editor-api]
- [Entity API][entity-api]
- [Context Menu][context-menu]

[sql-text-editor-api]: ./api/sql-text-editor
[entity-api]: ./api/entity.md
[context-menu]: ./context-menu
