#!/bin/bash
# Runs shellcheck over every tracked shell script and fails the build on any
# finding at `warning` severity or above. This is the guard that would have
# caught the `$external: unbound variable` crash in the mongodb-kerberos
# entrypoint (an unassigned variable reference under `set -u`, SC2154).
#
# Severity is pinned to `warning` deliberately: `info`/`style` findings (mostly
# unquoted-variable nags) are too noisy to gate on across the existing scripts,
# but `warning`+ catches real correctness bugs. To silence a specific false
# positive, add an inline `# shellcheck disable=SCxxxx` directive with a comment
# explaining why rather than lowering the global severity.
#
# Run locally with: bin/check-shell-scripts.sh

set -euo pipefail

SEVERITY=warning

if ! command -v shellcheck >/dev/null 2>&1; then
  echo "shellcheck is not installed." >&2
  echo "Install it with: apt-get install shellcheck  (or: brew install shellcheck)" >&2
  echo "See https://github.com/koalaman/shellcheck#installing" >&2
  exit 1
fi

# Tracked .sh files only, so node_modules and local worktrees are excluded.
mapfile -t files < <(git ls-files '*.sh')

if [[ ${#files[@]} -eq 0 ]]; then
  echo "No shell scripts found."
  exit 0
fi

if ! shellcheck --severity="$SEVERITY" "${files[@]}"; then
  echo
  echo "shellcheck found issues at severity '$SEVERITY' or above (see above)."
  echo "Fix them, or add a justified inline '# shellcheck disable=SCxxxx' directive."
  exit 1
fi

echo "shellcheck: ${#files[@]} scripts clean (severity >= $SEVERITY)."
