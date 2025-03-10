# SQL Text Editor

The Text Editor that is specialized for SQL queries.

## Basic Usage

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

## Keybindings

You can add custom keybindings using the `keybindings` property.

```js
sqlTextEditor.keybindings = {
  "Ctrl-Enter": () => {},
  "Cmd-Enter": () => {},
};
```

## Autocompletion

You can add a list of entities to autocomplete using the `entities` property.

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

For info on how to modify the context menu can be found in
[Context Menu][context-menu] and the [SQL Text Editor API][sql-text-editor-api] docs.

## API

See the API reference below for more details.

- [SQL Text Editor API][sql-text-editor-api]
- [Entity API][entity-api]

[sql-text-editor-api]: ./api/sql-text-editor.md
[entity-api]: ./api/entity.md
[context-menu]: ./context-menu.md
