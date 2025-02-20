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

| Property     | Type                                                   | Required | Description           |
| ------------ | ------------------------------------------------------ | -------- | --------------------- |
| `id`         | `string`                                               | No       | Unique identifier     |
| `name`       | `string`                                               | **Yes**  | Entity name           |
| `entityType` | `"table"` \| `"view"` \| `"materialized-view"` \| `""` | No       | The type of entity    |
| `schema`     | `string`                                               | No       | Schema name           |
| `columns`    | `TableColumn[]`                                        | No       | List of table columns |

#### TableColumn Interface

| Property   | Type     | Required | Description                 |
| ---------- | -------- | -------- | --------------------------- |
| `field`    | `string` | **Yes**  | Column name                 |
| `dataType` | `string` | No       | The data type of the column |

### Routine

| Property           | Type             | Required | Description                               |
| ------------------ | ---------------- | -------- | ----------------------------------------- |
| `id`               | `string`         | No       | Unique identifier                         |
| `name`             | `string`         | **Yes**  | Routine name                              |
| `entityType`       | `"routine"`      | **Yes**  | Must be `"routine"`                       |
| `schema`           | `string`         | No       | Schema name                               |
| `returnType`       | `string`         | **Yes**  | Return type of the routine                |
| `returnTypeLength` | `number`         | No       | Length of the return type (if applicable) |
| `routineParams`    | `RoutineParam[]` | No       | List of routine parameters                |

#### RoutineParam Interface

| Property | Type     | Required | Description                |
| -------- | -------- | -------- | -------------------------- |
| `name`   | `string` | **Yes**  | Parameter name             |
| `type`   | `string` | **Yes**  | Data type of the parameter |
| `length` | `number` | No       | Length of the parameter    |

### Schema

| Property     | Type       | Required | Description        |
| ------------ | ---------- | -------- | ------------------ |
| `id`         | `string`   | No       | Unique identifier  |
| `name`       | `string`   | **Yes**  | Schema name        |
| `entityType` | `"schema"` | **Yes**  | Must be `"schema"` |

[data-editor]: ../data-editor.md
[entity-list]: ../entity-list.md
[sql-text-editor]: ../sql-text-editor.md
