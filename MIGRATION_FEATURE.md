# Server-to-Server Migration Feature

## Overview

The Server-to-Server Migration feature allows users to migrate database schemas and data between different database connections within Beekeeper Studio. This feature intelligently handles table dependencies through foreign key relationships to ensure data integrity during migration.

## Features

- **Three Migration Types:**
  - **Schema Only**: Migrate table structures, indexes, and constraints
  - **Data Only**: Migrate data while preserving existing schemas
  - **Schema and Data**: Complete migration of both structure and data

- **Intelligent Dependency Resolution:**
  - Automatically detects foreign key relationships
  - Uses topological sorting to determine correct migration order
  - Prevents circular dependency issues
  - Ensures referential integrity during data migration

- **Configurable Options:**
  - Drop existing tables before migration
  - Temporarily disable foreign key checks for faster migration
  - Adjustable batch size for data migration
  - Table selection (migrate all or specific tables)

- **Progress Tracking:**
  - Real-time progress updates
  - Table-by-table completion tracking
  - Row count monitoring
  - Error logging and reporting

## Architecture

### Core Components

1. **Migration Service** (`MigrationService.ts`)
   - Orchestrates the entire migration process
   - Manages progress tracking and error handling
   - Coordinates schema and data migration

2. **Dependency Resolver** (`DependencyResolver.ts`)
   - Implements Kahn's algorithm for topological sorting
   - Resolves table dependencies based on foreign keys
   - Groups tables by dependency levels for parallel processing
   - Detects circular dependencies

3. **Schema Extractor** (`SchemaExtractor.ts`)
   - Extracts complete table schemas from source database
   - Generates CREATE TABLE statements
   - Handles foreign keys, indexes, and triggers
   - Adapts SQL for different database types

4. **Data Migrator** (`DataMigrator.ts`)
   - Migrates data in configurable batches
   - Handles foreign key constraint management
   - Provides progress callbacks
   - Supports different database types

### UI Components

- **MigrationConfiguration.vue**: Select source/target connections and migration options
- **MigrationTableSelection.vue**: Choose specific tables to migrate
- **MigrationReview.vue**: Review settings before starting
- **MigrationProgress.vue**: Real-time progress monitoring
- **TabServerMigration.vue**: Main tab component with stepper workflow

### Store Module

- **MigrationModule** (`store/modules/migration/MigrationModule.ts`)
  - Manages migration state in Vuex
  - Handles service lifecycle
  - Provides reactive progress updates

## Usage

### Accessing the Feature

1. Connect to a database in Beekeeper Studio
2. Navigate to **Tools > Server to Server Migration**
3. A new migration tab will open with a step-by-step wizard

### Configuration Steps

#### Step 1: Configuration
- Select source connection (where data comes from)
- Select target connection (where data goes to)
- Choose migration type (schema, data, or both)
- Configure options:
  - Drop existing tables (warning: destructive)
  - Disable foreign key checks (recommended for faster migration)
  - Set batch size (default: 1000 rows)

#### Step 2: Table Selection
- View all tables from source database
- Select specific tables to migrate (optional)
- Empty selection migrates all tables

#### Step 3: Review
- Review all settings before starting
- Verify source and target connections
- Check selected tables and options

#### Step 4: Migration Progress
- Monitor real-time progress
- View completed tables and row counts
- Check for errors or warnings
- Cancel migration if needed

## Dependency Resolution

The migration system uses a topological sort algorithm to determine the correct order for table migration:

1. **Foreign Key Analysis**: Extracts all foreign key relationships from source database
2. **Dependency Graph**: Builds a directed graph of table dependencies
3. **Topological Sort**: Orders tables ensuring dependencies are migrated first
4. **Circular Detection**: Identifies and reports circular dependencies

### Example

Given these tables:
- `users` (no dependencies)
- `orders` (depends on `users`)
- `order_items` (depends on `orders` and `products`)
- `products` (no dependencies)

Migration order:
1. `users`, `products` (can be parallel)
2. `orders`
3. `order_items`

## Database Support

The migration feature works with all database types supported by Beekeeper Studio:

- PostgreSQL
- MySQL / MariaDB
- SQL Server
- SQLite
- Oracle
- CockroachDB
- Redshift
- And more...

### Database-Specific Handling

- **Auto-increment conversion**: Automatically adapts between IDENTITY, AUTO_INCREMENT, SERIAL, etc.
- **Quote characters**: Adapts identifier quoting (backticks, double quotes, brackets)
- **Foreign key management**: Database-specific constraint handling
- **Data type mapping**: Best-effort type conversion between databases

## Limitations

1. **Cross-database migrations**: Some data types may not convert perfectly between different database systems
2. **Triggers and procedures**: May require manual adjustment for different database types
3. **Large datasets**: Very large tables may take considerable time to migrate
4. **Network connectivity**: Both source and target connections must be stable throughout migration
5. **Permissions**: Requires CREATE, INSERT, and potentially DROP permissions on target database

## Error Handling

The migration system includes comprehensive error handling:

- **Connection errors**: Validates connections before starting
- **Permission errors**: Reports insufficient privileges
- **Constraint violations**: Logs foreign key constraint failures
- **Data conversion errors**: Reports type compatibility issues
- **Partial completion**: Allows retry from failed point

## Testing

Unit tests are provided for core functionality:

- `DependencyResolver.spec.ts`: Tests topological sorting and circular dependency detection
- `SchemaExtractor.spec.ts`: Tests schema extraction and SQL generation
- More tests can be added for DataMigrator and integration scenarios

## Future Enhancements

Potential improvements for future versions:

- [ ] Resume failed migrations from checkpoint
- [ ] Parallel table migration for independent tables
- [ ] Data transformation/mapping during migration
- [ ] Incremental migrations (sync changes)
- [ ] Migration preview/dry-run mode
- [ ] Export migration as SQL script
- [ ] Migration history and rollback
- [ ] Cross-version database migrations
- [ ] Custom column mapping
- [ ] Filtered data migration (WHERE clauses)

## Contributing

When contributing to the migration feature:

1. Maintain dependency resolution logic integrity
2. Add tests for new functionality
3. Update documentation for new options
4. Consider database-specific edge cases
5. Test with various database combinations

## License

This feature is part of Beekeeper Studio and follows the same licensing terms.
