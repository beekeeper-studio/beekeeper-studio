#!/bin/bash
# Starts DBeaver CE headless (Xvfb) with an isolated HOME, so the workspace lands in
# $DBEAVER_HOME/.local/share/DBeaverData/workspace6 exactly like a real Linux install.
#   DBEAVER_DIR   extracted dbeaver-ce-*-linux-x86_64.tar.gz
#   DBEAVER_HOME  throwaway home directory
set -euo pipefail
: "${DBEAVER_DIR:?set DBEAVER_DIR}" "${DBEAVER_HOME:?set DBEAVER_HOME}"
mkdir -p "$DBEAVER_HOME"
export HOME="$DBEAVER_HOME" JAVA_TOOL_OPTIONS=
exec xvfb-run -a -s "-screen 0 1600x1200x24" "$DBEAVER_DIR/dbeaver" -nosplash \
  --launcher.appendVmargs -vmargs -Duser.home="$DBEAVER_HOME"
