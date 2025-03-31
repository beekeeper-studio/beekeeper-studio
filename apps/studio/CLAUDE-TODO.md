
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