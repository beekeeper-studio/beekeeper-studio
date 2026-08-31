#!/bin/bash
# Fails the build if a new `console.log(...)` call lands in the source tree
# outside the allowlist. Direct console.log calls bypass the shared logger
# (and therefore the redacter), so credentials can leak into the terminal
# even when the file log is clean.
#
# Add new code via `import rawLog from '@bksLogger'` and `log.debug(...)`.
# To intentionally allow a console.log (rare — e.g. a top-level diagnostic
# in an entrypoint that runs before the logger is wired), regenerate the
# allowlist with: bin/check-for-console-logs.sh --update

set -euo pipefail

ALLOWLIST=bin/allowed-console-logs.txt
SEARCH_PATHS=(apps/studio/src apps/studio/src-commercial)

current=$(git grep -nE 'console\.log\(' "${SEARCH_PATHS[@]}" \
  | awk -F: '
    {
      path=$1
      text=substr($0, index($0, $3))
      sub(/^[ \t]+/, "", text)
      print path "::" text
    }' \
  | sort)

if [[ "${1:-}" == "--update" ]]; then
  printf '%s\n' "$current" > "$ALLOWLIST"
  echo "Updated $ALLOWLIST ($(wc -l < "$ALLOWLIST") entries)"
  exit 0
fi

if [[ ! -f "$ALLOWLIST" ]]; then
  echo "Missing $ALLOWLIST. Generate it with: $0 --update" >&2
  exit 1
fi

allowed=$(sort -u "$ALLOWLIST")
new=$(comm -13 <(printf '%s\n' "$allowed") <(printf '%s\n' "$current"))

if [[ -n "$new" ]]; then
  echo "New console.log calls detected outside the allowlist."
  echo "These bypass the shared logger (@bksLogger) and its password redacter."
  echo "Switch them to log.debug / log.info via @bksLogger, or — if a top-level"
  echo "diagnostic is genuinely needed — regenerate the allowlist with:"
  echo "  $0 --update"
  echo
  echo "New entries:"
  printf '%s\n' "$new" | sed 's/^/  /'
  exit 1
fi

removed=$(comm -23 <(printf '%s\n' "$allowed") <(printf '%s\n' "$current"))
if [[ -n "$removed" ]]; then
  echo "Some allowlisted console.log entries are gone — please refresh the"
  echo "allowlist so it stays accurate: $0 --update"
  echo
  echo "Removed entries:"
  printf '%s\n' "$removed" | sed 's/^/  /'
  exit 1
fi

echo "No new console.log calls."
