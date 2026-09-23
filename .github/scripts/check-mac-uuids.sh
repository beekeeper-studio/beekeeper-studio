#!/bin/bash
# Fails if any executable in the first app has the same Mach-O UUID as an executable
# in one of the other apps. macOS Local Network privacy identifies apps by these
# UUIDs, so a shared UUID means a shared Local Network permission (#4774).
#
# Usage: check-mac-uuids.sh "<label>=<App.app>" "<label>=<Other.app>"...
set -euo pipefail

# Main executable plus each helper app's executable
executables() {
  find "$1/Contents/MacOS" -maxdepth 1 -type f
  find "$1/Contents/Frameworks" -maxdepth 4 -path '*.app/Contents/MacOS/*' -type f
}

# One line per image: label, UUID, arch, executable
uuids() {
  local label="$1" app="$2"
  if [ ! -d "$app" ]; then
    echo "::error::$label not found at $app" >&2
    exit 1
  fi
  executables "$app" | while IFS= read -r exe; do
    dwarfdump --uuid "$exe" | awk -v label="$label" -v exe="$(basename "$exe")" \
      '$1 == "UUID:" { gsub(/[()]/, "", $3); printf "%s\t%s\t%s\t%s\n", label, $2, $3, exe }'
  done
}

subject="${1%%=*}"
table=$(mktemp)
uuids "$subject" "${1#*=}" > "$table"
shift
others=()
for other in "$@"; do
  others+=("${other%%=*}")
  uuids "${other%%=*}" "${other#*=}" >> "$table"
done

awk -F'\t' '{ printf "%-24s %-38s %-8s %s\n", $1, $2, $3, $4 }' "$table"
echo

clashes=$(awk -F'\t' -v subject="$subject" '
  $1 == subject { if ($2 in mine) mine[$2] = mine[$2] ", " $4; else mine[$2] = $4; next }
  ($2 in mine) { printf "%s (%s) has the same UUID as %s: %s, %s\n", mine[$2], $3, $1, $4, $2 }
' "$table")

if [ -n "$clashes" ]; then
  while IFS= read -r line; do echo "::error::$line"; done <<< "$clashes"
  exit 1
fi
echo "No $subject executable shares a UUID with: $(IFS=,; echo "${others[*]}" | sed 's/,/, /g')"
