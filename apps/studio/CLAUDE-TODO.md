
Beekeeper Studio is a database management app, it allows users to interact with the databases - editing data, running sql queries, etc.

Drivers are located in src/lib/db/clients/, they use BasicDatabaseClient as the parent class. When first implementing a driver, we use BaseV1DatabaseClient -- it requires us to implement the minimum functions for a v1 client implentation.

Integration tests for drivers are in tests/integration/lib/db/clients/

An example driver:
src/lib/db/clients/postgresql.ts
tests/integration/lib/db/clients/postgres.spec.ts

## 1. Implement a v1 Trino Database driver

- First - Make a class with no implementation then get an integration test harness working with a simple SELECT 1 query. It should fail to begin with
- Second - make the test pass by implementing as much trino client as needed.
- Third - Write a trino-todo file with instructions for next steps

## 2. Complete the Trino Database Driver Implementation

### Improve Core Functionality
1. Implement proper Trino HTTP query execution flow in `rawExecuteQuery()`
   - Handle async query execution via nextUri in response
   - Track query status and request results when complete
   - Implement pagination for large result sets 
   - Add proper error handling for Trino error responses

2. Fix connection handling
   - Update constructor to handle all Trino connection parameters
   - Implement proper connection testing in `connect()`
   - Add connection pooling if needed
   - Enhance SSL/TLS support

3. Fix version detection
   - Update `versionString()` to query system tables for version
   - Return proper Trino server version

4. Improve data types handling 
   - Update `parseTableColumn()` to map Trino data types to BksTypes
   - Handle Trino-specific complex types (arrays, maps, etc.)

### Schema Management Methods
1. Complete table metadata functions
   - Fix `listTables()` to handle proper Trino catalog and schema hierarchy
   - Implement `listViews()` to show views
   - Enhance `listTableColumns()` with complete column metadata

2. Add catalog handling
   - Update `listDatabases()` to list catalogs instead of schemas
   - Enhance `listSchemas()` to use current catalog if not specified

3. Implement key and index functions
   - Add support for `getPrimaryKey()` and `getPrimaryKeys()`
   - Complete `getTableKeys()` for foreign key references
   - Implement `listTableIndexes()` for connector-specific indexes

### Streaming and Large Result Sets
1. Implement streaming methods
   - Complete `selectTopStream()` function
   - Complete `queryStream()` function for streaming query results

### Query Execution Enhancements
1. Add query cancellation support
   - Implement cancellation via Trino API
   - Track query IDs for active queries

2. Improve query result handling
   - Add proper query type detection (SELECT, INSERT, etc.)
   - Handle query statistics and metadata
   - Track affected rows for DML statements

### Create Integration Tests
1. Create basic integration tests for Trino
   - Set up Docker container for Trino testing
   - Build test harness with sample data
   - Write tests for all core driver functions

2. Test with multiple connectors
   - Test with various catalog types (MySQL, PostgreSQL, etc.)
   - Verify connector-specific limitations

### Review and Complete TODO Items
1. Address all items in the existing trino-todo.md file
2. Verify authentication methods work properly
   - Basic auth with username/password
   - Other authentication methods as needed