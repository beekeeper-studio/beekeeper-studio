# Data Editor

Data Editor consists of [Table][table], [Entity List][entity-list] and
[SQL Text Editor][sql-text-editor] components in one place.

## Basic Usage

```html
<bks-data-editor></bks-data-editor>
<script>
  const dataEditor = document.querySelector("bks-data-editor");
  dataEditor.entities = [
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

## Query Submission

```js
dataEditor.addEventListener("bks-query-submit", (event) => {
  const query = event.detail.query;
  const result = await runQuery(query);
  dataEditor.setTable({
    name: "result",
    columns: result.columns,
    data: result.data,
  });
})
```

## API

See the API reference below for more details.

- [Data Editor API][data-editor-api]
- [Entity API][entity-api]

[table]: ./table.md
[entity-list]: ./entity-list.md
[sql-text-editor]: ./sql-text-editor.md
[data-editor-api]: ./api/data-editor.md
[entity-api]: ./api/entity.md
[context-menu]: ./context-menu.md

