# Snowflake Integration Test Setup

This document describes how to set up and run integration tests for Snowflake support in Beekeeper Studio.

## Prerequisites

1. A Snowflake account with appropriate permissions
2. A test database and schema (recommended to use a dedicated test environment)
3. Node.js and npm/yarn installed

## Environment Variables

Set the following environment variables before running the tests:

### Required Variables

```bash
export SNOWFLAKE_ACCOUNT="your-account-identifier"  # e.g., "myorg-myaccount"
export SNOWFLAKE_USER="your-username"
export SNOWFLAKE_PASSWORD="your-password"
export SNOWFLAKE_DATABASE="test_database"
```

### Optional Variables

```bash
export SNOWFLAKE_SCHEMA="PUBLIC"          # Default: PUBLIC
export SNOWFLAKE_WAREHOUSE="your-warehouse"  # Optional
export SNOWFLAKE_ROLE="your-role"         # Optional
```

### Skip Tests

```bash
export SNOWFLAKE_SKIP_TESTS="true"        # Skip Snowflake tests entirely
```

## Snowflake Account Setup

### 1. Create Test Database

```sql
-- Connect to your Snowflake instance as an admin user
CREATE DATABASE IF NOT EXISTS beekeeper_test;
USE DATABASE beekeeper_test;
CREATE SCHEMA IF NOT EXISTS PUBLIC;
```

### 2. Create Test User (Optional but Recommended)

```sql
-- Create a dedicated test user
CREATE USER IF NOT EXISTS beekeeper_test_user 
    PASSWORD = 'secure_password_here'
    DEFAULT_WAREHOUSE = 'your_warehouse'
    DEFAULT_DATABASE = 'beekeeper_test'
    DEFAULT_SCHEMA = 'PUBLIC';

-- Grant necessary permissions
GRANT USAGE ON WAREHOUSE your_warehouse TO USER beekeeper_test_user;
GRANT USAGE ON DATABASE beekeeper_test TO USER beekeeper_test_user;
GRANT ALL ON SCHEMA beekeeper_test.PUBLIC TO USER beekeeper_test_user;
GRANT CREATE TABLE ON SCHEMA beekeeper_test.PUBLIC TO USER beekeeper_test_user;
GRANT CREATE VIEW ON SCHEMA beekeeper_test.PUBLIC TO USER beekeeper_test_user;
```

### 3. Find Your Account Identifier

Your Snowflake account identifier can be found in several ways:

1. **From Snowflake Web UI**: Look at the URL when logged in: `https://app.snowflake.com/region/account_identifier/`
2. **From SQL**: Run `SELECT CURRENT_ACCOUNT()` in a Snowflake worksheet
3. **Account Locator Format**: Usually in the format `orgname-accountname` or just `accountname`

## Running the Tests

### 1. Set Environment Variables

Create a `.env` file in the project root or export variables:

```bash
# .env file
SNOWFLAKE_ACCOUNT=myorg-myaccount
SNOWFLAKE_USER=beekeeper_test_user
SNOWFLAKE_PASSWORD=secure_password_here
SNOWFLAKE_DATABASE=beekeeper_test
SNOWFLAKE_WAREHOUSE=compute_wh
```

### 2. Run Integration Tests

```bash
# Run only Snowflake tests
npm test -- --testPathPattern=snowflake.spec.ts

# Run all integration tests (including Snowflake)
npm run test:integration
```

### 3. Run with Debug Logging

```bash
# Enable debug logging for Snowflake client
DEBUG=SnowflakeClient npm test -- --testPathPattern=snowflake.spec.ts
```

## Test Structure

The integration tests cover:

### Connection Tests
- Basic connection establishment
- Authentication validation
- Error handling for invalid credentials

### Metadata Tests
- List databases, schemas, tables, views
- Column information and data types
- Primary key discovery
- Table row counts

### Query Tests
- Simple SELECT queries
- Parameterized queries
- Complex data type handling
- Result pagination (selectTop)

### Schema Tests
- Cross-schema table access
- Qualified table names

### Error Handling
- Invalid SQL statements
- Non-existent tables/objects

## Test Data

The tests automatically create and clean up test data:

- `BKS_TEST_TABLE`: Main test table with various data types
- `BKS_COMPLEX_TYPES`: Table with complex Snowflake data types
- `BKS_TEST_VIEW`: Simple view for testing view listing
- `BKS_SCHEMA_TEST`: Cross-schema test table (if custom schema is used)

## Troubleshooting

### Common Issues

1. **Connection Timeout**: Snowflake connections can be slow. The tests use extended timeouts.

2. **Case Sensitivity**: Snowflake converts unquoted identifiers to uppercase. Tests account for this.

3. **Warehouse Not Running**: Make sure your warehouse is running or use `AUTO_RESUME`.

4. **Permission Errors**: Ensure the test user has sufficient permissions on the test database.

### Debug Information

Enable verbose logging:

```bash
# Snowflake SDK debug
export DEBUG="snowflake:*"

# Beekeeper debug
export DEBUG="SnowflakeClient"
```

### Connection String Format

If needed, the Snowflake connection uses this format:
- Host: `account_identifier.snowflakecomputing.com`
- Port: `443` (HTTPS)
- SSL: Always enabled

## Security Notes

1. **Never commit credentials** to version control
2. **Use dedicated test accounts** with minimal permissions
3. **Regularly rotate test passwords**
4. **Use separate test databases** to avoid affecting production data
5. **Clean up test data** after running tests

## CI/CD Integration

For automated testing in CI/CD:

```yaml
# Example GitHub Actions
env:
  SNOWFLAKE_ACCOUNT: ${{ secrets.SNOWFLAKE_ACCOUNT }}
  SNOWFLAKE_USER: ${{ secrets.SNOWFLAKE_USER }}
  SNOWFLAKE_PASSWORD: ${{ secrets.SNOWFLAKE_PASSWORD }}
  SNOWFLAKE_DATABASE: beekeeper_test
  SNOWFLAKE_WAREHOUSE: compute_wh

steps:
  - name: Run Snowflake Integration Tests
    run: npm test -- --testPathPattern=snowflake.spec.ts
```

Set secrets in your CI/CD platform's secret management system.