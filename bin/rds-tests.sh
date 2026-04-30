#! /bin/bash
# Thin wrapper around the RDS integration jest suite.
# Mirrors bin/integration-tests.sh but skips the Oracle instant-client
# bootstrap (no Oracle driver is exercised against RDS).

set -euo pipefail

export ELECTRON_RUN_AS_NODE=1
export TEST_MODE=1

yarn workspace beekeeper-studio internal:rds "$@"
