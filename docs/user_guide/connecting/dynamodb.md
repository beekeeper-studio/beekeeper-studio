---
title: DynamoDB
summary: "Connect to Amazon DynamoDB with Beekeeper Studio"
icon: amazondynamodb
description: "Browse tables, run PartiQL queries, and edit data in DynamoDB using Beekeeper Studio"
---

# DynamoDB Support

!!! note "Beta feature"
    DynamoDB support is currently in beta. It works well, but you may run into the occasional rough edge — please [report any issues](https://github.com/beekeeper-studio/beekeeper-studio/issues/new/choose).

## Connecting to DynamoDB

DynamoDB is a managed AWS service, so there's no host or port to enter. Select **DynamoDB** as the connection type, then choose how to authenticate:

- **IAM Access Key and Secret Key** — enter an access key ID and secret access key directly.
- **IAM Credentials File** — use a named profile from the shared AWS credentials file (`~/.aws/credentials`).
- **AWS CLI Authentication** — reuse the credentials from an existing AWS CLI configuration.

Set the **AWS Region** your tables live in (for example, `us-east-1`).

### Connecting to DynamoDB Local

To connect to [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html) or another DynamoDB-compatible endpoint, enter its address in the **Custom Endpoint** field (for example, `http://localhost:8000`). Any non-empty credentials work against a local endpoint.

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
