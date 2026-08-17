#!/bin/bash
# Reproduces issue #4657: "6.0.1+ fails to launch on Windows Server 2025 -
# DuckDB binding error".
#
# What the reported bug actually is
# --------------------------------
# `dist/utility.js` requires `@duckdb/node-api` unconditionally at module scope
# (via src/lib/db/serialization/transcoders.ts and the DuckDB client), so the
# DuckDB native addon is dlopen'd while the utility process is still booting --
# long before anyone asks for a DuckDB connection.
#
# If that dlopen fails for any reason, the utility process dies during startup
# and never posts its `ready` message. main.ts's `app.on('ready')` handler does:
#
#     await createUtilityProcess()   // resolves only on the 'ready' message
#     await buildWindow(settings)    // therefore never runs
#
# so no window is ever built, and the `exit` handler reforks the utility process
# forever. The user sees the app die with no window and no dialog; the addon
# error only shows up if the app was started from a console.
#
# On the reporter's machine the dlopen fails because a dependency of
# duckdb.node cannot be resolved. duckdb.node imports duckdb.dll (shipped
# alongside it, and correct in the release), and duckdb.dll in turn imports
# MSVCP140.dll, VCRUNTIME140.dll, VCRUNTIME140_1.dll, RstrtMgr.DLL, WS2_32.dll
# and the api-ms-win-crt-* UCRT stubs. ERR_DLOPEN_FAILED with "The specified
# module could not be found" (ERROR_MOD_NOT_FOUND) means one of those is
# missing on that machine.
#
# What this script does
# ---------------------
# The Linux build has exactly the same shape -- duckdb.node with a sibling
# libduckdb.so resolved through RUNPATH=$ORIGIN -- so making that sibling
# unresolvable reproduces the same failure locally: the same ERR_DLOPEN_FAILED
# at utility-process startup, the same silent no-window launch, and the same
# refork loop.
#
# Usage:  bin/repro-issue-4657.sh [path-to-appimage]
#
# With no argument it downloads the 6.0.1 Linux AppImage. Needs curl and
# xvfb-run (xvfb-run only so the baseline run has somewhere to draw).

set -euo pipefail

VERSION="6.0.1"
RUN_SECONDS=45
WORKDIR="${TMPDIR:-/tmp}/bks-repro-4657"
APPIMAGE="${1:-}"

for cmd in curl xvfb-run; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "$cmd is required but not installed." >&2
    exit 1
  fi
done

mkdir -p "$WORKDIR"
cd "$WORKDIR"

if [[ -z "$APPIMAGE" ]]; then
  APPIMAGE="$WORKDIR/Beekeeper-Studio-$VERSION.AppImage"
  if [[ ! -f "$APPIMAGE" ]]; then
    echo "==> Downloading Beekeeper Studio $VERSION AppImage"
    curl -sSL -o "$APPIMAGE" \
      "https://github.com/beekeeper-studio/beekeeper-studio/releases/download/v$VERSION/Beekeeper-Studio-$VERSION.AppImage"
  fi
fi
chmod +x "$APPIMAGE"

if [[ ! -d "$WORKDIR/squashfs-root" ]]; then
  echo "==> Extracting AppImage"
  "$APPIMAGE" --appimage-extract >/dev/null
fi

BINDINGS="$WORKDIR/squashfs-root/resources/app.asar.unpacked/node_modules/@duckdb/node-bindings-linux-x64"
if [[ ! -f "$BINDINGS/duckdb.node" ]]; then
  echo "Could not find duckdb.node under $BINDINGS" >&2
  exit 1
fi

echo "==> duckdb.node links against:"
readelf -d "$BINDINGS/duckdb.node" | grep -E 'NEEDED|RUNPATH' | sed 's/^/    /'

# Run the app headless for a fixed window and report whether a BrowserWindow was
# ever constructed. WindowBuilder logs "PRELOAD PATH:" on every window it builds,
# which survives the production log level, unlike the main process's own logging.
run_app() {
  local logfile="$1"
  set +e
  timeout "$RUN_SECONDS" xvfb-run -a --server-args='-screen 0 1280x800x24' \
    "$WORKDIR/squashfs-root/AppRun" --no-sandbox >"$logfile" 2>&1
  set -e
}

report() {
  local label="$1" logfile="$2"
  printf '    %-10s windows built: %-3s  ERR_DLOPEN_FAILED: %s\n' \
    "$label" \
    "$(grep -c 'PRELOAD PATH' "$logfile" || true)" \
    "$(grep -c 'ERR_DLOPEN_FAILED' "$logfile" || true)"
}

# Restore a previous run that was interrupted before it could put the library back.
if [[ -f "$BINDINGS/libduckdb.so.disabled" && ! -f "$BINDINGS/libduckdb.so" ]]; then
  mv "$BINDINGS/libduckdb.so.disabled" "$BINDINGS/libduckdb.so"
fi

echo "==> Baseline: unmodified app, ${RUN_SECONDS}s"
run_app "$WORKDIR/baseline.log"

echo "==> Broken: duckdb.node's sibling libduckdb.so made unresolvable, ${RUN_SECONDS}s"
mv "$BINDINGS/libduckdb.so" "$BINDINGS/libduckdb.so.disabled"
run_app "$WORKDIR/broken.log"
mv "$BINDINGS/libduckdb.so.disabled" "$BINDINGS/libduckdb.so"

echo
echo "==> Results"
report baseline "$WORKDIR/baseline.log"
report broken "$WORKDIR/broken.log"
echo
echo "==> Error as it appears in the broken run"
grep -A2 'cannot open shared object file' "$WORKDIR/broken.log" | head -3 | sed 's/^/    /'
grep -m1 -B1 -A1 "code: 'ERR_DLOPEN_FAILED'" "$WORKDIR/broken.log" | sed 's/^/    /'
echo
echo "Logs: $WORKDIR/baseline.log, $WORKDIR/broken.log"
echo "Expected: baseline builds 1 window and reports no dlopen errors; broken"
echo "builds 0 windows and reports one ERR_DLOPEN_FAILED per refork attempt."
