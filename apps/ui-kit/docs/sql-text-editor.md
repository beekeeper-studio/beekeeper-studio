# SQL Text Editor

The Text Editor that is specialized for SQL queries.

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

## Context Menu

For info on how to modify the context menu can be found in
[Context Menu][context-menu] and the [SQL Text Editor API][sql-text-editor-api] docs.

## Customization

You can customize the appearance of the SQL Text Editor by overriding the CSS variables. This allows you to change colors for syntax highlighting, background, text, and other visual elements to match your application's theme.

```css
.BksSqlTextEditor {
  --bks-text-editor-activeline-bg-color: #373831;
  --bks-text-editor-atom-fg-color: #ae81ff;
  --bks-text-editor-bg-color: #ffffff;
  --bks-text-editor-bracket-fg-color: rgba(0, 0, 0, 0.67);
  --bks-text-editor-builtin-fg-color: #66d9ef;
  --bks-text-editor-comment-attribute-fg-color: #97b757;
  --bks-text-editor-comment-def-fg-color: #bc9262;
  --bks-text-editor-comment-fg-color: #75715e;
  --bks-text-editor-comment-tag-fg-color: #bc6283;
  --bks-text-editor-comment-type-fg-color: #bc6283;
  --bks-text-editor-cursor-bg-color: rgba(0, 0, 0, 0.87);
  --bks-text-editor-def-fg-color: #fd971f;
  --bks-text-editor-error-bg-color: #f8f8f0;
  --bks-text-editor-error-fg-color: #f92672;
  --bks-text-editor-fg-color: rgba(0, 0, 0, 0.87);
  --bks-text-editor-gutter-bg-color: #ffffff;
  --bks-text-editor-guttermarker-fg-color: #f8f8f2;
  --bks-text-editor-guttermarker-subtle-fg-color: rgba(0, 0, 0, 0.25);
  --bks-text-editor-header-fg-color: #ae81ff;
  --bks-text-editor-keyword-fg-color: #ff00f0;
  --bks-text-editor-linenumber-fg-color: rgba(0, 0, 0, 0.25);
  --bks-text-editor-link-fg-color: #ae81ff;
  --bks-text-editor-matchingbracket-fg-color: #ffffff;
  --bks-text-editor-number-fg-color: #ff8d21;
  --bks-text-editor-property-fg-color: #a6e22e;
  --bks-text-editor-selected-bg-color: rgba(0, 0, 0, 0.25);
  --bks-text-editor-string-fg-color: #0d9161;
  --bks-text-editor-tag-fg-color: #f92672;
  --bks-text-editor-variable-2-fg-color: #0099ff;
  --bks-text-editor-variable-3-fg-color: #66d9ef;
  --bks-text-editor-variable-fg-color: #f8f8f2;
}
```

## API

See the API reference below for more details.

- [SQL Text Editor API][sql-text-editor-api]
- [Entity API][entity-api]

[sql-text-editor-api]: ./api/sql-text-editor.md
[entity-api]: ./api/entity.md
[context-menu]: ./context-menu.md
