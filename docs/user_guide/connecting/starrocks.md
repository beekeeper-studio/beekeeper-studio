---
title: StarRocks
summary: Connect Beekeeper Studio to a StarRocks cluster over the MySQL wire protocol.
icon: material/database
---

StarRocks speaks the MySQL wire protocol, so connections use the same form as MySQL. The default query port is `9030`.

## Connection details

| Field    | Value                                       |
| -------- | ------------------------------------------- |
| Host     | Frontend (FE) hostname                      |
| Port     | `9030` (FE query port)                      |
| Username | StarRocks user, typically `root`            |
| Password | Password for the StarRocks user             |

## Unsupported and limited features

StarRocks diverges from MySQL in several areas, and Beekeeper Studio disables the features that do not have a native equivalent:

- **Transactions and manual commit** — StarRocks' SQL transaction support is intentionally narrow; staged changes are applied one statement at a time rather than in a single transaction.
- **Foreign keys** — Not supported by StarRocks.
- **Generated columns and triggers** — Not supported by StarRocks.
- **`CREATE INDEX`** — StarRocks uses prefix and bitmap indexes with different syntax.
- **`ALTER TABLE`** — Add/drop/rename column, rename table, rename schema, and rename view are limited or asynchronous in StarRocks.

## Primary keys

Beekeeper reads primary keys from `information_schema.columns` (`column_key = 'PRI'`) rather than `SHOW KEYS`, because `SHOW KEYS` is empty for StarRocks' primary key model.
