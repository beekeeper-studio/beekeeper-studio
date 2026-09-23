#!/bin/bash
# Fails unless Beekeeper gets its own macOS Local Network permission.
#
# Vanilla Electron (same Electron version) asks for Local Network access first and
# is denied. Beekeeper then makes a Bonjour query: macOS has to show an alert naming
# Beekeeper Studio, and once that is allowed the query has to work. When the two
# apps share a Mach-O UUID, macOS never asks about Beekeeper and it stays blocked
# with EHOSTUNREACH (#4774, #4088).
#
# Usage: check-mac-local-network.sh <Beekeeper Studio.app> <Electron.app> <output dir>
set -uo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
out="$3"
mkdir -p "$out"
lsregister=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister
electron=/Applications/Electron.app
bks="/Applications/Beekeeper Studio.app"

# macOS only resolves the executable UUIDs of apps LaunchServices knows about
sudo rm -rf "$electron" "$bks"
sudo ditto "$2" "$electron"
sudo ditto "$1" "$bks"
"$lsregister" -f "$electron" "$bks"
dwarfdump --uuid "$electron/Contents/MacOS/Electron" "$bks/Contents/MacOS/Beekeeper Studio"

# probe <label> <app> <alert name> <allow|deny>: sets BEFORE, ALERT and AFTER
probe() {
  local label="$1" app="$2" name="$3" answer="$4" prefix="$out/$1"
  open -n -g --env ELECTRON_RUN_AS_NODE=1 --stdout "$prefix.stdout" --stderr "$prefix.stderr" \
    -a "$app" --args "$here/mac-local-network-probe.js" "$prefix"
  for _ in $(seq 1 60); do [ -f "$prefix.1" ] && break; sleep 1; done
  if [ ! -f "$prefix.1" ]; then
    echo "::error::The probe never ran in $app"
    cat "$prefix.stderr"
    exit 1
  fi
  sleep 4
  screencapture -x "$out/$label-alert.png" || true
  ALERT=$(osascript "$here/mac-local-network-alert.applescript" "$answer" "$name" 2>&1)
  sleep 3
  touch "$prefix.go"
  for _ in $(seq 1 30); do [ -f "$prefix.2" ] && break; sleep 1; done
  BEFORE=$(cat "$prefix.1")
  AFTER=$(cat "$prefix.2" 2>/dev/null || echo "no result")
  echo "$name: before the alert: $BEFORE | alert: $ALERT | after: $AFTER"
}

allowed() { [ "$1" = REPLY ] || [ "$1" = SENT ]; }

probe electron "$electron" Electron deny
if [[ "$ALERT" != CLICKED* ]] || allowed "$AFTER"; then
  echo "::error::Vanilla Electron was not asked for, or not denied, Local Network access, so this runner can't show the problem"
  exit 1
fi

probe beekeeper "$bks" "Beekeeper Studio" allow
if [[ "$ALERT" != CLICKED* ]]; then
  echo "::error::macOS never asked for Beekeeper Studio's Local Network permission, it shares that permission with vanilla Electron (denied) and stays blocked: $AFTER"
  exit 1
fi
if ! allowed "$AFTER"; then
  echo "::error::Beekeeper Studio's Local Network access was allowed but its Bonjour query still failed: $AFTER"
  exit 1
fi
echo "Beekeeper Studio got its own Local Network alert and works after being allowed, while vanilla Electron stays denied"
