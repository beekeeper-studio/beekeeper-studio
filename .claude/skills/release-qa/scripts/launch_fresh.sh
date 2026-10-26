#!/usr/bin/env bash
# Pristine first-run launch: fake HOME, default userData (no --user-data-dir). Use this to test first-run behaviour.
#   launch_fresh.sh <squashfs-root dir> <fresh HOME dir> [port=9224]
APP="$1"; FRESH_HOME="$2"; PORT="${3:-9224}"
rm -rf "$FRESH_HOME"; mkdir -p "$FRESH_HOME"
export DISPLAY="${QA_DISPLAY:-:99}" HOME="$FRESH_HOME"
nohup "$APP/beekeeper-studio-bin" --no-sandbox --disable-gpu --remote-debugging-port="$PORT" \
  --remote-allow-origins='*' >"$FRESH_HOME/app.log" 2>&1 &
sleep 12; curl -s "localhost:$PORT/json/list" | grep -E '"url"'
# logs for this instance: $FRESH_HOME/.config/beekeeper-studio/logs/utility.log
