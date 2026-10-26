#!/usr/bin/env bash
# Screen recording of the whole X display (also captures native dialogs).
#   QA_DIR=/path rec.sh start <name>   -> $QA_DIR/video/<name>.mp4
#   QA_DIR=/path rec.sh stop
QA_DIR="${QA_DIR:-$PWD/qa-out}"; mkdir -p "$QA_DIR/video"
D="${QA_DISPLAY:-:99}"
case "$1" in
  start)
    nohup ffmpeg -y -loglevel error -f x11grab -framerate 10 -video_size 1600x1000 -i "$D" \
      -c:v libx264 -preset ultrafast -pix_fmt yuv420p "$QA_DIR/video/$2.mp4" >"$QA_DIR/video/ffmpeg.log" 2>&1 &
    echo $! >"$QA_DIR/video/.pid"; echo "recording -> $QA_DIR/video/$2.mp4" ;;
  stop)
    [ -f "$QA_DIR/video/.pid" ] && kill -INT "$(cat "$QA_DIR/video/.pid")" 2>/dev/null; sleep 1.5; echo stopped ;;
esac
