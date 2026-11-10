#!/bin/bash
#
# Check whether a branch has commits that aren't in the base branch.
#
# Prints the number of commits the branch is ahead of base to stdout.
# Exits 0 if the branch is ahead (has changes to merge), 1 if it's not.
#
# Usage:
#   check-branch-ahead.sh <branch>
#
# Env:
#   REMOTE        remote name (default: origin)
#   BASE_BRANCH   branch to compare against (default: master)

set -euo pipefail

REMOTE="${REMOTE:-origin}"
BASE_BRANCH="${BASE_BRANCH:-master}"
branch="${1:?usage: check-branch-ahead.sh <branch>}"

# Resolve a branch name to a ref that exists, preferring the remote copy.
resolve() {
  if git rev-parse --verify --quiet "$REMOTE/$1" >/dev/null; then
    echo "$REMOTE/$1"
  elif git rev-parse --verify --quiet "$1" >/dev/null; then
    echo "$1"
  else
    echo "error: ref not found: $1" >&2
    exit 2
  fi
}

base_ref=$(resolve "$BASE_BRANCH")
branch_ref=$(resolve "$branch")

ahead=$(git rev-list --count "$base_ref..$branch_ref")
echo "$ahead"

[ "$ahead" -gt 0 ]
