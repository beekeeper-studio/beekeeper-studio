# Table

The Table component displays data of a database table in a tabular form with
spreadsheet like selection.

## Basic Usage

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

## Primary Keys

Primary keys are indicated by key icon in the column header.

```js
table.columns = [
  {
    field: "id",
    primaryKey: true,
  },
];
```

## Foreign Keys

Similar to primary keys and a button is shown next to the value in the table.

```js
table.columns = [
  {
    field: "userId",
    foreignKey: true,
  },
];
```

To listen to foreign key clicks, use the `bks-foreign-key-go-to` event.

```js
table.addEventListener("bks-foreign-key-go-to", (event) => {
  const { value, field, cell } = event.detail;
  console.log(value, field, cell);
});
```

## Editing

To enable editing, set the `editable` property to `true`.

```js
table.columns = [
  {
    field: "userId",
    editable: true,
  },
];
```

## Context Menu

More info on how to modify the context menu can be found in
[Context Menu][context-menu] and the [Table API][table-api] docs.

## API

See the API reference below for more details.

- [Table API][table-api]

[table-api]: ./api/table.md
[context-menu]: ./context-menu.md
