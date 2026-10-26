#! /bin/bash

set -euxo pipefail

BINBASE=`dirname $0`
BASE=`pwd`
LOCATION="$BASE/.instant"

# Specs under apps/studio/tests/vitest/ run under vitest instead of jest (see
# apps/studio/tests/VITEST_MIGRATION.md).
SPEC="${1:-}"
SPEC_REL="${SPEC#apps/studio/}"
IS_VITEST=false
if [[ "$SPEC_REL" == tests/vitest/* ]]; then
  IS_VITEST=true
fi

# Jest runs everything through here, but vitest specs only need the oracle
# instant client when they are oracle specs.
if [[ "$IS_VITEST" == false || "$(basename "$SPEC_REL")" == oracle* ]]; then
  eval "$BINBASE/get-instant-client.sh '$LOCATION'"

  export ORACLE_CLI_PATH="$LOCATION/instantclient_21_17/"
  export LD_LIBRARY_PATH="$ORACLE_CLI_PATH"
fi

if [[ "$IS_VITEST" == true ]]; then
  exec yarn workspace beekeeper-studio vitest:integration "$SPEC_REL"
fi

export ELECTRON_RUN_AS_NODE=1
export TEST_MODE=1

yarn workspace beekeeper-studio internal:integration "$@"
