#!/usr/bin/env bash
# set this for debugging
# set -euxo pipefail

CLONE=/proc/sys/kernel/unprivileged_userns_clone

SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  SCRIPT_DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE" # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
SCRIPT_DIR="$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )"

if [ ! -f "$CLONE" ]; then
  exec "$SCRIPT_DIR/beekeeper-studio-bin" "$@"
else
  UNPRIVILEGED_USERNS_ENABLED=$(cat "$CLONE" 2>/dev/null)
  if [[ $UNPRIVILEGED_USERNS_ENABLED == 0 ]]; then
    exec "$SCRIPT_DIR/beekeeper-studio-bin" "--no-sandbox" "$@"
  else
    exec "$SCRIPT_DIR/beekeeper-studio-bin" "$@"
  fi
fi
