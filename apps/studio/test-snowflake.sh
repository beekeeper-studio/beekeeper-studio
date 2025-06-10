#!/bin/bash

# Snowflake Integration Test Runner
# This script helps set up and run Snowflake integration tests

set -e

echo "🏔️  Snowflake Integration Test Runner"
echo "===================================="

# Check if environment variables are set
if [ -z "$SNOWFLAKE_ACCOUNT" ]; then
    echo "❌ SNOWFLAKE_ACCOUNT environment variable is not set"
    echo ""
    echo "Required environment variables:"
    echo "  SNOWFLAKE_ACCOUNT    - Your Snowflake account identifier"
    echo "  SNOWFLAKE_USER       - Your Snowflake username"
    echo "  SNOWFLAKE_PASSWORD   - Your Snowflake password"
    echo "  SNOWFLAKE_DATABASE   - Test database name"
    echo ""
    echo "Optional environment variables:"
    echo "  SNOWFLAKE_SCHEMA     - Schema name (default: PUBLIC)"
    echo "  SNOWFLAKE_WAREHOUSE  - Warehouse name"
    echo "  SNOWFLAKE_ROLE       - Role name"
    echo ""
    echo "To skip tests entirely, set:"
    echo "  SNOWFLAKE_SKIP_TESTS=true"
    echo ""
    echo "Example:"
    echo "  export SNOWFLAKE_ACCOUNT=\"myorg-myaccount\""
    echo "  export SNOWFLAKE_USER=\"testuser\""
    echo "  export SNOWFLAKE_PASSWORD=\"mypassword\""
    echo "  export SNOWFLAKE_DATABASE=\"test_db\""
    echo "  ./test-snowflake.sh"
    exit 1
fi

if [ -z "$SNOWFLAKE_USER" ]; then
    echo "❌ SNOWFLAKE_USER environment variable is not set"
    exit 1
fi

if [ -z "$SNOWFLAKE_PASSWORD" ]; then
    echo "❌ SNOWFLAKE_PASSWORD environment variable is not set"
    exit 1
fi

if [ -z "$SNOWFLAKE_DATABASE" ]; then
    echo "❌ SNOWFLAKE_DATABASE environment variable is not set"
    exit 1
fi

echo "✅ Environment variables configured:"
echo "   Account: $SNOWFLAKE_ACCOUNT"
echo "   User: $SNOWFLAKE_USER"
echo "   Database: $SNOWFLAKE_DATABASE"
echo "   Schema: ${SNOWFLAKE_SCHEMA:-PUBLIC}"
echo "   Warehouse: ${SNOWFLAKE_WAREHOUSE:-<not set>}"
echo "   Role: ${SNOWFLAKE_ROLE:-<not set>}"
echo ""

# Test mode selection
if [ "$1" = "--unit" ]; then
    echo "🧪 Running Snowflake unit tests..."
    npm test -- --testPathPattern="snowflake" --testPathIgnorePatterns="integration"
elif [ "$1" = "--integration" ]; then
    echo "🔗 Running Snowflake integration tests..."
    npm test -- --testPathPattern="integration.*snowflake.spec.ts" --testTimeout=60000
elif [ "$1" = "--all" ]; then
    echo "🎯 Running all Snowflake tests..."
    npm test -- --testPathPattern="snowflake" --testTimeout=60000
elif [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [mode]"
    echo ""
    echo "Modes:"
    echo "  --unit         Run only unit tests"
    echo "  --integration  Run only integration tests"
    echo "  --all          Run all Snowflake tests"
    echo "  --help, -h     Show this help message"
    echo ""
    echo "If no mode is specified, integration tests will be run."
    exit 0
else
    echo "🔗 Running Snowflake integration tests (default)..."
    npm test -- --testPathPattern="integration.*snowflake.spec.ts" --testTimeout=60000
fi

echo ""
echo "✅ Snowflake tests completed!"