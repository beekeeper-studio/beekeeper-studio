#!/usr/bin/env bash
# Installs the Beekeeper Studio Claude Code skill.
#
# Usage:
#   curl -fsSL https://beekeeperstudio.io/skills/install.sh | sh
#   curl -fsSL https://beekeeperstudio.io/skills/install.sh | sh -s -- --no-permission
#
# This script:
#   1. Downloads SKILL.md and beekeeper.py into ~/.claude/skills/beekeeper.
#   2. Adds a permission allow rule to ~/.claude/settings.json so Claude Code
#      doesn't prompt every time it runs the helper.
#
# Pass --no-permission to skip step 2 (or run from a controlled environment).

set -euo pipefail

DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}/beekeeper"
SETTINGS="${CLAUDE_SETTINGS:-$HOME/.claude/settings.json}"
BASE="${BKS_SKILL_BASE:-https://beekeeperstudio.io/skills/beekeeper}"
SKIP_PERMISSION=0

for arg in "$@"; do
  case "$arg" in
    --no-permission) SKIP_PERMISSION=1 ;;
  esac
done

mkdir -p "$DEST"

fetch() {
  local name="$1"
  curl -fsSL --retry 3 --output "$DEST/$name" "$BASE/$name"
}

fetch SKILL.md
fetch beekeeper.py
chmod +x "$DEST/beekeeper.py"

# Pre-approve the helper invocation so Claude Code stops prompting.
ALLOW_RULE='Bash(python3 ~/.claude/skills/beekeeper/beekeeper.py:*)'
if [ "$SKIP_PERMISSION" = "0" ]; then
  if command -v jq >/dev/null 2>&1; then
    mkdir -p "$(dirname "$SETTINGS")"
    if [ ! -f "$SETTINGS" ]; then
      echo '{}' > "$SETTINGS"
    fi
    tmp="$(mktemp)"
    jq --arg rule "$ALLOW_RULE" '
      .permissions = (.permissions // {}) |
      .permissions.allow = ((.permissions.allow // []) + [$rule] | unique)
    ' "$SETTINGS" > "$tmp" && mv "$tmp" "$SETTINGS"
    echo "Added permission rule to $SETTINGS"
  else
    cat <<EOF
jq is not installed; could not auto-add the permission rule.
Add this line to the "permissions.allow" array of $SETTINGS:

  $ALLOW_RULE

EOF
  fi
fi

cat <<EOF
Installed Beekeeper Studio skill to:
  $DEST

Next steps:
  1. Open Beekeeper Studio.
  2. Set [aiServer] disabled = false in your user.config.ini and restart.
  3. Tools -> AI Server -> Start server.
  4. Add at least one connection to the allowlist.
  5. Restart Claude Code so it picks up the skill.
EOF
