#!/bin/bash
#
# List all rc-* branches, one per line.
#
# Looks at remote branches first (refs/remotes/$REMOTE/rc-*) and falls back to
# local branches if the remote has none — handy for testing locally.
#
# Env:
#   REMOTE   remote name to inspect (default: origin)

set -euo pipefail

REMOTE="${REMOTE:-origin}"

branches=$(git for-each-ref --format='%(refname:strip=3)' "refs/remotes/$REMOTE/rc-*")

if [ -z "$branches" ]; then
  # No remote rc-* branches, fall back to local ones.
  branches=$(git for-each-ref --format='%(refname:strip=2)' 'refs/heads/rc-*')
fi

echo "$branches"
