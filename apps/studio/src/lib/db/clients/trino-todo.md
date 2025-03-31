# Trino Client Todo List

This document contains a list of remaining tasks for the Trino database client implementation.

## Critical Tasks

1. **Implement proper query execution flow**
   - The current implementation uses a very basic fetch implementation
   - Need to handle Trino's async query execution properly using nextUri in the response
   - Implement proper error handling from Trino error responses

2. **Proper authentication**
   - Implement support for various authentication mechanisms:
     - Basic authentication
     - Kerberos
     - JWT
     - OAuth2

3. **Connection handling**
   - Implement proper connection pooling
   - Handle connection timeouts
   - Verify SSL/TLS support

## Feature Implementation

1. **Schema/Catalog support**
   - Proper handling of Trino's catalog and schema hierarchies
   - Implement listCatalogs function
   - Better schema navigation

2. **Type mapping**
   - Map Trino data types to BksTypes properly
   - Handle Trino-specific types
   - Support array types

3. **Query features**
   - Implement streaming for large result sets
   - Support query cancellation
   - Implement prepared statements if possible

4. **Table operations**
   - Implement table creation
   - Support for advanced operations (partitioning, etc.)
   - Handle table statistics

## Testing

1. **Integration tests**
   - Expand test coverage
   - Test with real-world Trino setups
   - Test with different catalogs (MySQL, PostgreSQL, Hive)

2. **Error handling**
   - Test different error scenarios
   - Verify meaningful error messages are returned

## UI Integration

1. **Connection dialog**
   - Create Trino-specific connection UI
   - Add catalog selection dropdown
   - Support for configuration parameters

2. **Trino-specific features**
   - Support for Trino query hints
   - Support for session properties
   - Support for explain plans