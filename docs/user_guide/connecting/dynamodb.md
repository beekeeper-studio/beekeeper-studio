---
title: DynamoDB
summary: "Connect to Amazon DynamoDB with Beekeeper Studio"
icon: amazondynamodb
description: "Browse tables, run PartiQL queries, and edit data in DynamoDB using Beekeeper Studio"
---

# DynamoDB Support

## Supported Features

- Table data view (Scan-based)
- Filtering by table column
- Table structure view (sampled — DynamoDB is schemaless)
- Entity sidebar
- Editing data (insert / update / delete)
- Running PartiQL queries
- Read-only mode
- IAM key, profile, and AWS CLI credential resolution
- Connecting to DynamoDB Local via custom endpoint

## Limitations

DynamoDB is not a relational database and many table-view features are mapped onto its API as best they can be. The following caveats apply:

### Sorting

DynamoDB has no server-side `ORDER BY` for `Scan`, so column sorting in the table view is **not available**. Sorting would require pulling the entire table into memory and sorting locally, which is too expensive to do while browsing.

### Filtering

Table-view filters are mapped onto DynamoDB `FilterExpression`. Filtering happens after `Scan`, so highly selective filters on large tables can still trigger long scans even though only a few rows are returned.

### Schema discovery

DynamoDB only declares attribute types for indexed attributes. The column list is inferred by sampling a small number of rows (configurable via `db.dynamodb.columnSampleSize`), so attributes that appear only in unsampled rows may not show up in the structure view.

### Other unsupported features

- ALTER (add/drop/rename column, etc.) — schemaless, not applicable
- Foreign key relationships
- Triggers, routines, materialized views
- Server-side `TRUNCATE` — drop and recreate the table instead
- Renaming tables
