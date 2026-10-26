#!/usr/bin/env bash
# Drive the open native GTK chooser (Open File / Select Folder / Save File): Ctrl+L, type the full path, CLICK the
# primary button at the bottom-right.  Pressing Return in the location bar CANCELS the dialog - always click.
#   gtkdialog.sh <absolute path>
export DISPLAY="${QA_DISPLAY:-:99}"
W=$(xdotool search --name "^(Open File|Save File|Save As|Select Folder|Select.*|Choose.*)$" 2>/dev/null | tail -1)
[ -z "$W" ] && { echo "no dialog window found"; exit 1; }
xdotool windowfocus "$W" 2>/dev/null; sleep 0.4
GEOM=$(xwininfo -id "$W"); X=$(echo "$GEOM" | awk '/Absolute upper-left X/{print $4}'); Y=$(echo "$GEOM" | awk '/Absolute upper-left Y/{print $4}')
WD=$(echo "$GEOM" | awk '/Width/{print $2}'); HT=$(echo "$GEOM" | awk '/Height/{print $2}')
xdotool key --clearmodifiers ctrl+l; sleep 0.4
xdotool type --clearmodifiers --delay 15 "$1"; sleep 0.6
xdotool mousemove $((X+WD-49)) $((Y+HT-24)) click 1; sleep 1.2
echo "dialog driven with: $1"
