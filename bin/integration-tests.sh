#! /bin/bash

set -euxo pipefail

BINBASE=`dirname $0`
BASE=`pwd`
LOCATION="$BASE/.instant"

eval "$BINBASE/get-instant-client.sh '$LOCATION'"

export ORACLE_CLI_PATH="$LOCATION/instantclient_21_17/"
export LD_LIBRARY_PATH="$ORACLE_CLI_PATH"
export ELECTRON_RUN_AS_NODE=1
export TEST_MODE=1

# Spec paths arrive relative to the repo root (see get-db-files-as-json.sh);
# vitest runs from apps/studio and filters by path substring.
ARGS=()
for arg in "$@"; do
  ARGS+=("${arg#apps/studio/}")
done

pnpm -F beekeeper-studio vitest:integration ${ARGS[@]+"${ARGS[@]}"}
