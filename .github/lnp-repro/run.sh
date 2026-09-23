#!/bin/bash
# Temporary repro for #4774 / #4088: macOS Local Network privacy enforces its
# decisions by the main executable's Mach-O UUID, and Beekeeper ships Electron's
# stock binary, so it shares that UUID with every app on the same Electron version.
#
# 1. Vanilla Electron.app (same UUID) makes local network requests; its alert is
#    answered with $2 (deny|allow).
# 2. Beekeeper ($1: the 6.1.2 release, or the release with a patched UUID) makes the
#    same requests. If an alert naming Beekeeper appears, it gets the opposite answer.
set -uo pipefail

SUBJECT="$1"
DECISION="$2"
if [ "$DECISION" = deny ]; then OPPOSITE=allow; else OPPOSITE=deny; fi
HERE="$(cd "$(dirname "$0")" && pwd)"
W=/tmp/lnp
OUT="$W/out"
mkdir -p "$OUT" "$W/apps"
cd "$W"
EV=39.8.10
BV=6.1.2
LSREGISTER=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister

section() { echo; echo "=================== $* ==================="; }
shot() { screencapture -x "$OUT/$1.png" 2>&1 || true; }

section "System"
sw_vers; uname -m; id -un

section "Network"
IF=$(route -n get default | awk '/interface:/{print $2}')
GW=$(route -n get default | awk '/gateway:/{print $2}')
IP=$(ipconfig getifaddr "$IF")
echo "interface=$IF ip=$IP gateway=$GW"
scutil --dns | awk '/nameserver\[[0-9]\]/{print "dns: " $3}' | sort -u
# Root is exempt from Local Network privacy, so this listener never prompts
sudo python3 -m http.server 18080 --bind "$IP" >/dev/null 2>&1 &
sleep 1
TARGETS="tcp:$IP:18080 udp:$GW:53 tcp:1.1.1.1:443"
echo "targets: $TARGETS"

section "Download and install apps"
curl -sSfL -o electron.zip "https://github.com/electron/electron/releases/download/v$EV/electron-v$EV-darwin-arm64.zip"
curl -sSfL -o bks.zip "https://github.com/beekeeper-studio/beekeeper-studio/releases/download/v$BV/Beekeeper-Studio-$BV-arm64-mac.zip"
ditto -x -k electron.zip apps/
ditto -x -k bks.zip apps/
if [ "$SUBJECT" = patched ]; then
  python3 "$HERE/patch_uuid.py" "apps/Beekeeper Studio.app/Contents/MacOS/Beekeeper Studio" io.beekeeperstudio.desktop
  codesign --force --sign - "apps/Beekeeper Studio.app" 2>&1 | tail -2
fi
OTHER="/Applications/Electron.app"
BKS="/Applications/Beekeeper Studio.app"
sudo ditto apps/Electron.app "$OTHER"
sudo ditto "apps/Beekeeper Studio.app" "$BKS"
"$LSREGISTER" -f "$OTHER" "$BKS"

section "Mach-O UUIDs and signatures"
dwarfdump --uuid "$OTHER/Contents/MacOS/Electron" "$BKS/Contents/MacOS/Beekeeper Studio"
for a in "$OTHER" "$BKS"; do codesign -dv "$a" 2>&1 | grep -E '^(Identifier|TeamIdentifier|Signature)'; done

section "Start Local Network privacy log capture"
sudo log stream --style compact --info --debug \
  --predicate 'subsystem == "com.apple.networkextension" OR process == "nehelper" OR process == "nesessionmanager"' \
  > "$OUT/lnp-log.txt" 2>&1 &
LOGPID=$!
sleep 2

probe() { # label app alert-name answer(allow|deny)
  local label="$1" app="$2" name="$3" answer="$4" res="$OUT/$1"
  section "[$label] $app"
  open -n -g --env ELECTRON_RUN_AS_NODE=1 --stdout "$res.stdout" --stderr "$res.stderr" \
    -a "$app" --args "$HERE/probe.js" "$label" "$res" $TARGETS
  for _ in $(seq 1 60); do [ -f "$res.r1.json" ] && break; sleep 1; done
  if [ ! -f "$res.r1.json" ]; then
    echo "probe never reported"; tail -5 "$res.stderr" 2>/dev/null; return
  fi
  echo "round 1 (before any answer):"; cat "$res.r1.json"; echo
  sleep 4
  shot "$label-alert"
  echo "windows with buttons on screen:"
  osascript "$HERE/alerts.applescript" list 2>&1
  echo "answering an alert naming “$name” with '$answer':"
  osascript "$HERE/alerts.applescript" "$answer" "$name" 2>&1
  sleep 3
  touch "$res.go"
  for _ in $(seq 1 30); do [ -f "$res.r2.json" ] && break; sleep 1; done
  echo "round 2 (after answer):"; cat "$res.r2.json" 2>/dev/null || echo "(none)"; echo
  sleep 2
}

probe electron "$OTHER" Electron "$DECISION"
probe "beekeeper-$SUBJECT" "$BKS" "Beekeeper Studio" "$OPPOSITE"

section "System Settings > Privacy & Security > Local Network"
open "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_LocalNetwork"
sleep 8
shot settings-local-network
osascript "$HERE/settings.applescript" 2>&1 | head -60

sudo kill "$LOGPID" 2>/dev/null

section "Signing identifier -> executable UUID cache"
sudo plutil -p /Library/Preferences/com.apple.networkextension.uuidcache.plist 2>&1 | head -60

section "Local Network privacy decisions (log)"
grep -E 'Created path rule for|Populating the cache|User responded|Draining local network|UUIDs for .* are already' "$OUT/lnp-log.txt" \
  | grep -vE 'com\.apple\.' | sed -E 's/^[0-9-]+ [0-9:.]+ +//' | awk '!seen[$0]++' | head -60
exit 0
