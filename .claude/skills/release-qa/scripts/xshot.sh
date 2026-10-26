#!/usr/bin/env bash
# Grab the whole X display (use this while a native dialog is open - page.screenshot hangs then).
#   QA_DIR=/path xshot.sh <name>  -> $QA_DIR/shots/<name>.png
QA_DIR="${QA_DIR:-$PWD/qa-out}"; mkdir -p "$QA_DIR/shots"
D="${QA_DISPLAY:-:99}"
ffmpeg -y -loglevel error -f x11grab -video_size 1600x1000 -i "$D" -frames:v 1 "$QA_DIR/shots/$1.png" && echo "$QA_DIR/shots/$1.png"
