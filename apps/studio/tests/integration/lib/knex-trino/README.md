# Knex-Trino Integration Tests

This directory contains integration tests for the custom Knex driver for Trino databases. The tests ensure that the driver correctly handles database operations, query building, and error scenarios.

## Test Files

- **index.spec.ts**: Basic integration tests for connectivity and simple queries
- **schema.spec.ts**: Tests for schema operations like creating/dropping tables and columns
- **query.spec.ts**: Tests for query builder and data type handling
- **error-handling.spec.ts**: Tests for proper error handling and edge cases

## Test Requirements

- Docker installed (for running a Trino container)
- Jest as the test framework
- testcontainers library for managing Docker containers during tests

## Running Tests

To run the tests:

```bash
yarn test:integration -- --testPathPattern=knex-trino
```

Or run a specific test file:

```bash
yarn test:integration -- --testPathPattern=knex-trino/index.spec.ts
```

## Test Approach

These tests use a real Trino Docker container to test actual database interactions. The tests verify that:

1. The Knex query builder correctly generates SQL for Trino
2. Queries execute correctly and return expected results
3. Data types are properly handled and converted
4. Errors are properly caught and reported
5. Edge cases like large queries, many placeholders, and Unicode characters work correctly

## Test Data

The tests create temporary tables in the `memory` catalog of Trino, which provides a clean testing environment that is reset between test runs.

Some tests also use the built-in `tpch` catalog that comes with Trino, which contains sample data like customers, orders, and nations for more complex query testing.