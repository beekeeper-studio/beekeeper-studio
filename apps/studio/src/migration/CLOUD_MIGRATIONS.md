# Cloud App Migrations

This document tracks migrations that need to be applied to the Beekeeper Studio Cloud app (Rails).

When adding new connection options or fields to `saved_connection` or `used_connection` tables, corresponding migrations must also be created in the Rails cloud app.

## Pending Cloud Migrations

### 20260417_add_dynamodb_options.js

Adds `dynamoDbOptions` column to `saved_connection` and `used_connection` tables.

**Rails migration needed:**
```ruby
add_column :saved_connections, :dynamo_db_options, :text, default: '{}'
add_column :used_connections, :dynamo_db_options, :text, default: '{}'
```
