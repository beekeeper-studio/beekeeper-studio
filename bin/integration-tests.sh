#! /bin/bash

set -euxo pipefail

BINBASE=`dirname $0`
BASE=`pwd`
LOCATION="$BASE/.instant"

# Specs under apps/studio/tests/vitest/ run under vitest instead of jest (see
# apps/studio/tests/VITEST_MIGRATION.md). The vitest path skips the oracle
# instant-client setup below — no migrated spec needs it yet.
SPEC="${1:-}"
SPEC_REL="${SPEC#apps/studio/}"
if [[ "$SPEC_REL" == tests/vitest/* ]]; then
  exec yarn workspace beekeeper-studio vitest:integration "$SPEC_REL"
fi

eval "$BINBASE/get-instant-client.sh '$LOCATION'"

export ORACLE_CLI_PATH="$LOCATION/instantclient_21_17/"
export LD_LIBRARY_PATH="$ORACLE_CLI_PATH"
export ELECTRON_RUN_AS_NODE=1
export TEST_MODE=1

yarn workspace beekeeper-studio internal:integration "$@"
