#!/usr/bin/env bash
set - ex

UNPRIVILEGED_USERNS_ENABLED = $(cat / proc / sys / kernel / unprivileged_userns_clone 2 > /dev/null)
SCRIPT_DIR = "$( cd "$(dirname "${BASH_SOURCE[0]}")" && pwd )"
exec "$SCRIPT_DIR/beekeeper-studio-bin" "$([[ $UNPRIVILEGED_USERNS_ENABLED == 0 ]] && echo '--no-sandbox')" "$@"