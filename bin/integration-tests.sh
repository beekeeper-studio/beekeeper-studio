#! /bin/bash

set -euxo pipefail

BINBASE=`dirname $0`
BASE=`pwd`
LOCATION="$BASE/.instant"

eval "$BINBASE/get-instant-client.sh '$LOCATION'"

export ORACLE_CLI_PATH="$LOCATION/instantclient_21_6/"
export LD_LIBRARY_PATH="$ORACLE_CLI_PATH"
export ELECTRON_RUN_AS_NODE=1
export TEST_MODE=1

yarn workspace beekeeper-studio internal:integration "$@"
