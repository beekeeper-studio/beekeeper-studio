#!/usr/bin/env bash
# Starts a virtual X display (default :99, 1600x1000) if one is not already running.
D="${QA_DISPLAY:-:99}"
if ! pgrep -af "Xvfb $D" >/dev/null; then
  nohup Xvfb "$D" -screen 0 1600x1000x24 >/dev/null 2>&1 &
  sleep 2
fi
echo "display $D ready"
