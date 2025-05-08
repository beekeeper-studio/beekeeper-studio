# Data Editor API

For examples and usage details, visit [Data Editor][data-editor] page.

## Properties

| Name                 | Type       | Description                                                            | Default |
| -------------------- | ---------- | ---------------------------------------------------------------------- | ------- |
| `entities`           | `object[]` | An array of entities. See [Entity API][entity-api] for more details.   | `[]`    |
| `entityListProps`    | `object`   | An object of [Entity List properties][entity-list-properties].         | `{}`    |
| `sqlTextEditorProps` | `object`   | An object of [SQL Text Editor properties][sql-text-editor-properties]. | `{}`    |
| `tableProps`         | `object`   | An object of [Table properties][table-api-properties].                 | `{}`    |

## Methods

| Name          | Description           | Arguments |
| ------------- | --------------------- | --------- |
| `setEntity()` | Sets the entity data. | `Entity`  |

## Events

All events of [Table][table-api-events], [Entity List][entity-list-events]
and [SQL Text Editor][sql-text-editor-events] components are available, in addition to the following events:

| Name               | Description                          | Event Detail        |
| ------------------ | ------------------------------------ | ------------------- |
| `bks-query-submit` | Emitted when the query is submitted. | `{ query: string }` |

[data-editor]: ../data-editor.md
[table-api-properties]: ./table.md#properties
[entity-list-properties]: ./entity-list.md#properties
[sql-text-editor-properties]: ./sql-text-editor.md#properties
[table-api-events]: ./table.md#events
[entity-list-events]: ./entity-list.md#events
[sql-text-editor-events]: ./sql-text-editor.md#events
[entity-api]: ./api/entity.md
