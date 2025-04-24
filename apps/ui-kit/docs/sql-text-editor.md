# SQL Text Editor

The Text Editor that is specialized for SQL queries. It extends the [Text Editor](./text-editor.md) component and inherits all of its features including Language Server Protocol support.

![SQL Text Editor](./assets/images/sql-text-editor.png)

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

To use a custom function to autocomplete column names instead of using the `entities.columns` property, you can set the `columnsGetter` property.

```js
sqlTextEditor.columnsGetter = async (entityName) => {
  const columns = await fetchColumns(entityName);
  return [
    { field: "id", dataType: "integer" },
    { field: "name", dataType: "string" },
  ];
};
```
## API

See the API reference below for more details.

- [Text Editor][text-editor]
- [SQL Text Editor API][sql-text-editor-api]
- [Text Editor API][text-editor-api] (inherited features)
- [Entity API][entity-api]

[text-editor]: ./text-editor.md
[sql-text-editor-api]: ./api/sql-text-editor.md
[text-editor-api]: ./api/text-editor.md
[entity-api]: ./api/entity.md
[context-menu]: ./context-menu.md
