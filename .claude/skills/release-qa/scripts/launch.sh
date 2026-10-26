#!/usr/bin/env bash
# Launch an extracted Beekeeper Studio AppImage (squashfs-root) with a CDP debug port.
#   launch.sh <squashfs-root dir> <userData dir> [port=9222]
# Use a different <userData dir> AND port per instance to run two versions side by side.
# Output goes to <userData dir>/app.log; the utility process logs to ~/.config/beekeeper-studio/logs/utility.log.
APP="$1"; PROFILE="$2"; PORT="${3:-9222}"
export DISPLAY="${QA_DISPLAY:-:99}"
mkdir -p "$PROFILE"
nohup "$APP/beekeeper-studio-bin" --no-sandbox --disable-gpu \
  --user-data-dir="$PROFILE" --remote-debugging-port="$PORT" \
  --remote-allow-origins='*' >"$PROFILE/app.log" 2>&1 &
for i in $(seq 1 30); do curl -s "localhost:$PORT/json/list" | grep -q '"type": "page"' && { echo "app up on :$PORT"; exit 0; }; sleep 1; done
echo "app did not come up; see $PROFILE/app.log"; exit 1
