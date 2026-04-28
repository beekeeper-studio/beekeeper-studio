#!/usr/bin/env bash
# Installs the Beekeeper Studio Claude Code skill.
#
# Usage:
#   curl -fsSL https://beekeeperstudio.io/skills/install.sh | sh
#
# This script downloads SKILL.md and beekeeper.py into ~/.claude/skills/beekeeper.
# It does not start Beekeeper Studio or its AI server — open the app and use
# Tools -> AI Server -> Start server.

set -euo pipefail

DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}/beekeeper"
BASE="${BKS_SKILL_BASE:-https://beekeeperstudio.io/skills/beekeeper}"

mkdir -p "$DEST"

fetch() {
  local name="$1"
  curl -fsSL --retry 3 --output "$DEST/$name" "$BASE/$name"
}

fetch SKILL.md
fetch beekeeper.py
chmod +x "$DEST/beekeeper.py"

cat <<EOF
Installed Beekeeper Studio skill to:
  $DEST

Next steps:
  1. Open Beekeeper Studio.
  2. Tools -> AI Server -> Start server.
  3. Add at least one connection to the allowlist.
  4. In Claude Code, the "beekeeper" skill should now be available.
EOF
