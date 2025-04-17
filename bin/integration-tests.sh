#! /bin/bash

set -euxo pipefail

BINBASE=`dirname $0`
BASE=`pwd`
INSTANTLOCATION="$BASE/.instant"
SQLALOCATION="$BASE/.sqlanywhere"

eval "$BINBASE/get-instant-client.sh '$INSTANTLOCATION'"
eval "$BINBASE/get-sqlanywhere-client.sh '$SQLALOCATION'"

source $SQLALOCATION/sqlanywhere17/bin64/sa_config.sh
export ORACLE_CLI_PATH="$INSTANTLOCATION/instantclient_21_17/"
export LD_LIBRARY_PATH="$ORACLE_CLI_PATH:${LD_LIBRARY_PATH:-}"
export ELECTRON_RUN_AS_NODE=1
export TEST_MODE=1

yarn workspace beekeeper-studio internal:integration "$@"
