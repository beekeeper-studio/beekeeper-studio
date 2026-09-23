#!/bin/bash
# Temporary repro for #4774 / #4088: macOS Local Network privacy identifies apps by
# their main executable's Mach-O UUID, and Beekeeper ships Electron's stock binary.
#
# 1. "Other Electron app" (stock Electron.app, same UUID) makes a local network
#    connection and its alert is answered with $1 (deny|allow).
# 2. The real Beekeeper Studio release does the same; nobody touches any alert.
# 3. A copy of Beekeeper with a patched UUID does the same; its alert gets the
#    opposite answer.
set -uo pipefail

DECISION="$1"
if [ "$DECISION" = deny ]; then OPPOSITE=allow; else OPPOSITE=deny; fi
HERE="$(cd "$(dirname "$0")" && pwd)"
W=/tmp/lnp
OUT="$W/out"
mkdir -p "$OUT" "$W/apps"
cd "$W"
EV=39.8.10
BV=6.1.2

section() { echo; echo "=================== $* ==================="; }

section "System"
sw_vers; uname -m; id -un
echo "process chain:"
p=$$
while [ "$p" -gt 1 ]; do ps -o pid=,ppid=,user=,comm= -p "$p"; p=$(ps -o ppid= -p "$p" | tr -d ' '); done

section "Network"
IF=$(route -n get default | awk '/interface:/{print $2}')
GW=$(route -n get default | awk '/gateway:/{print $2}')
IP=$(ipconfig getifaddr "$IF")
echo "interface=$IF ip=$IP gateway=$GW"
python3 -m http.server 18080 --bind "$IP" >/dev/null 2>&1 &
sleep 1
TARGETS="$IP:18080 $GW:53 $GW:80 1.1.1.1:443"
echo "targets: $TARGETS"

section "Baseline from the runner shell (nc)"
for t in $TARGETS; do nc -vz -G 3 "${t%:*}" "${t##*:}" 2>&1 | tail -1; done

section "Download apps"
curl -sSfL -o electron.zip "https://github.com/electron/electron/releases/download/v$EV/electron-v$EV-darwin-arm64.zip"
curl -sSfL -o bks.zip "https://github.com/beekeeper-studio/beekeeper-studio/releases/download/v$BV/Beekeeper-Studio-$BV-arm64-mac.zip"
ditto -x -k electron.zip apps/
ditto -x -k bks.zip apps/
ls apps
OTHER="$W/apps/Electron.app"
BKS="$W/apps/Beekeeper Studio.app"
UNIQ="$W/apps/Beekeeper Studio Unique.app"
ditto "$BKS" "$UNIQ"
python3 "$HERE/patch_uuid.py" "$UNIQ/Contents/MacOS/Beekeeper Studio" io.beekeeperstudio.desktop
codesign --force --sign - "$UNIQ" 2>&1 | tail -2 || codesign --force --deep --sign - "$UNIQ" 2>&1 | tail -2
codesign --verify --verbose=1 "$UNIQ" 2>&1 | tail -2

section "Mach-O UUIDs of the main executables"
dwarfdump --uuid "$OTHER/Contents/MacOS/Electron" "$BKS/Contents/MacOS/Beekeeper Studio" "$UNIQ/Contents/MacOS/Beekeeper Studio"

section "Code signatures"
for a in "$OTHER" "$BKS" "$UNIQ"; do
  echo "-- $a"
  codesign -dv "$a" 2>&1 | grep -E '^(Identifier|TeamIdentifier|Signature)'
done

section "Start Local Network privacy log capture"
touch "$W/marker"
sleep 1
sudo log stream --style compact --info --debug \
  --predicate 'subsystem == "com.apple.networkextension" OR process == "nehelper" OR process == "nesessionmanager" OR process == "UserNotificationCenter"' \
  > "$OUT/lnp-log.txt" 2>&1 &
LOGPID=$!
sleep 2

probe() { # label app decision(allow|deny|none)
  local label="$1" app="$2" decision="$3" res="$OUT/$1"
  section "[$label] $(basename "$app"), alert answer: $decision"
  open -n -g --env ELECTRON_RUN_AS_NODE=1 --stdout "$res.stdout" --stderr "$res.stderr" \
    -a "$app" --args "$HERE/probe.js" "$label" "$res" $TARGETS
  for _ in $(seq 1 60); do [ -f "$res.r1.json" ] && break; sleep 1; done
  if [ ! -f "$res.r1.json" ]; then
    echo "probe never reported"; tail -5 "$res.stderr" 2>/dev/null; return
  fi
  echo "round 1 (before any answer):"; cat "$res.r1.json"; echo
  sleep 4
  echo "windows with buttons on screen:"
  osascript "$HERE/alerts.applescript" list 2>&1
  screencapture -x "$OUT/$label-screen.png" 2>&1 || true
  if [ "$decision" != none ]; then
    echo "answering alert with '$decision':"
    osascript "$HERE/alerts.applescript" "$decision" 2>&1
    sleep 3
  fi
  touch "$res.go"
  for _ in $(seq 1 30); do [ -f "$res.r2.json" ] && break; sleep 1; done
  echo "round 2 (after answer):"; cat "$res.r2.json" 2>/dev/null || echo "(none)"; echo
}

probe other-electron-app "$OTHER" "$DECISION"
probe beekeeper-6.1.2 "$BKS" none
probe beekeeper-unique-uuid "$UNIQ" "$OPPOSITE"

section "System Settings > Privacy & Security > Local Network"
open "x-apple.systempreferences:com.apple.preference.security?Privacy_LocalNetwork"
sleep 8
screencapture -x "$OUT/settings-local-network.png" 2>&1 || true
osascript "$HERE/settings.applescript" 2>&1 | head -80

sudo kill "$LOGPID" 2>/dev/null

section "Files written since the first probe"
sudo find /Library/Preferences /private/var/db "$HOME/Library/Preferences" "$HOME/Library/Group Containers" \
  -newer "$W/marker" -type f 2>/dev/null | grep -vE '/(diagnostics|uuidtext|powerlog|analyticsd)/|\.(log|tracev3)$' | head -40

section "com.apple.networkextension.plist lines mentioning the apps"
sudo plutil -p /Library/Preferences/com.apple.networkextension.plist 2>/dev/null | grep -n -iE 'electron|beekeeper|4c4c44e2|local' | head -60

section "Local Network privacy log lines"
grep -iE 'electron|beekeeper|local ?network|4C4C44E2' "$OUT/lnp-log.txt" | cut -c1-400 | head -150
exit 0
