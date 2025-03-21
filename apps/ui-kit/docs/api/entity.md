# Entity API

For examples and usage details, visit:

- [Data Editor][data-editor]
- [Entity List][entity-list]
- [SQL Text Editor][sql-text-editor]

## Overview

The `Entity` type represents different kinds of database objects, such as
tables, views, materialized views, routines, and schemas.

## Entity Types

### Table/View/Materialized View

| Property                  | Type                                                   | Description           | Default                                           |
| ------------------------- | ------------------------------------------------------ | --------------------- | ------------------------------------------------- |
| `id`                      | `string`                                               | Unique identifier     | Combination of `entityType`, `schema`, and `name` |
| `name`<sup>required</sup> | `string`                                               | Entity name           |                                                   |
| `entityType`              | `"table"` \| `"view"` \| `"materialized-view"` \| `""` | The type of entity    | `undefined`                                       |
| `schema`                  | `string`                                               | Schema name           | `undefined`                                       |
| `columns`                 | `TableColumn[]`                                        | List of table columns | `undefined`                                       |

#### TableColumn Interface

| Property                   | Type     | Description                 | Default     |
| -------------------------- | -------- | --------------------------- | ----------- |
| `field`<sup>required</sup> | `string` | Column name                 |             |
| `dataType`                 | `string` | The data type of the column | `undefined` |

### Routine

| Property                        | Type             | Description                               | Default                                           |
| ------------------------------- | ---------------- | ----------------------------------------- | ------------------------------------------------- |
| `id`                            | `string`         | Unique identifier                         | Combination of `entityType`, `schema`, and `name` |
| `name`<sup>required</sup>       | `string`         | Routine name                              |                                                   |
| `entityType`<sup>required</sup> | `"routine"`      | Must be `"routine"`                       |                                                   |
| `schema`                        | `string`         | Schema name                               | `undefined`                                       |
| `returnType`<sup>required</sup> | `string`         | Return type of the routine                |                                                   |
| `returnTypeLength`              | `number`         | Length of the return type (if applicable) | `undefined`                                       |
| `routineParams`                 | `RoutineParam[]` | List of routine parameters                | `undefined`                                       |

#### RoutineParam Interface

| Property                  | Type     | Description                | Default     |
| ------------------------- | -------- | -------------------------- | ----------- |
| `name`<sup>required</sup> | `string` | Parameter name             |             |
| `type`<sup>required</sup> | `string` | Data type of the parameter |             |
| `length`                  | `number` | Length of the parameter    | `undefined` |

### Schema

| Property                        | Type       | Description        | Default                                |
| ------------------------------- | ---------- | ------------------ | -------------------------------------- |
| `id`                            | `string`   | Unique identifier  | Combination of `entityType` and `name` |
| `name`<sup>required</sup>       | `string`   | Schema name        |                                        |
| `entityType`<sup>required</sup> | `"schema"` | Must be `"schema"` |                                        |

[data-editor]: ../data-editor.md
[entity-list]: ../entity-list.md
[sql-text-editor]: ../sql-text-editor.md
