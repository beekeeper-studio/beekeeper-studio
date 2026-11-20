#! /bin/bash

set -euxo pipefail

BASE=`pwd`
LOCATION="$BASE/.instant"

export ELECTRON_RUN_AS_NODE=1
export TEST_MODE=1

# Spec paths arrive relative to the repo root (see get-db-files-as-json.sh);
# vitest runs from apps/studio and filters by path substring.
ARGS=()
for arg in "$@"; do
  ARGS+=("${arg#apps/studio/}")
done

# The oracle specs (file name starts with "oracle") need the oracle instant
# client, which `pnpm test:integration:setup` downloads into apps/studio/.instant.
# A run with no spec filter includes them.
NEEDS_ORACLE=0
if [ "$#" -eq 0 ]; then
  NEEDS_ORACLE=1
fi
for arg in "$@"; do
  case "$(basename "$arg")" in
    oracle*) NEEDS_ORACLE=1 ;;
  esac
done

INSTANT_CLIENT="$LOCATION/instantclient_21_17"
if [ -d "$INSTANT_CLIENT" ]; then
  export ORACLE_CLI_PATH="$INSTANT_CLIENT/"
  export LD_LIBRARY_PATH="$ORACLE_CLI_PATH"
elif [ "$NEEDS_ORACLE" -eq 1 ]; then
  set +x
  echo "Oracle instant client not found at $INSTANT_CLIENT" >&2
  echo "Run 'pnpm test:integration:setup' first, then re-run the tests." >&2
  exit 1
fi

pnpm -F beekeeper-studio vitest:integration ${ARGS[@]+"${ARGS[@]}"}
