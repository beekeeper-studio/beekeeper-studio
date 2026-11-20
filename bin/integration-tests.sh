#! /bin/bash

set -euxo pipefail

BINBASE=`dirname $0`
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

# The oracle instant client is only used by specs whose file name starts with
# "oracle". CI runs one spec per job, so every other job skips the download.
# Local runs always fetch it: the download is cached in .instant after the
# first run, and a run with no filter includes the oracle specs.
NEEDS_ORACLE=0
if [ -z "${CI:-}" ] || [ "$#" -eq 0 ]; then
  NEEDS_ORACLE=1
fi
for arg in "$@"; do
  case "$(basename "$arg")" in
    oracle*) NEEDS_ORACLE=1 ;;
  esac
done

if [ "$NEEDS_ORACLE" -eq 1 ]; then
  "$BINBASE/get-instant-client.sh" "$LOCATION"
  export ORACLE_CLI_PATH="$LOCATION/instantclient_21_17/"
  export LD_LIBRARY_PATH="$ORACLE_CLI_PATH"
fi

pnpm -F beekeeper-studio vitest:integration ${ARGS[@]+"${ARGS[@]}"}
