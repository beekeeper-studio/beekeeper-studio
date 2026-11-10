#!/bin/bash
#
# Open a PR merging an rc-* branch into the base branch.
#
# Usage:
#   open-rc-pr.sh <branch> [ahead_count]
#
# Env:
#   BASE_BRANCH   target branch of the PR (default: master)
#   DRY_RUN       if set to 1, print what would happen instead of creating a PR
#
# Requires the `gh` CLI to be authenticated (gh auth login, or GH_TOKEN set).

set -euo pipefail

BASE_BRANCH="${BASE_BRANCH:-master}"
branch="${1:?usage: open-rc-pr.sh <branch> [ahead_count]}"
ahead="${2:-}"

title="Merge $branch into $BASE_BRANCH"

if [ -n "$ahead" ]; then
  count_text="$ahead commit(s) that are not in $BASE_BRANCH"
else
  count_text="commits that are not in $BASE_BRANCH"
fi

body="$branch contains $count_text. Release candidate fixes should always make it back into $BASE_BRANCH. This PR was opened automatically by the rc-prs scripts."

if [ "${DRY_RUN:-}" = "1" ]; then
  echo "[dry-run] would open PR: $branch -> $BASE_BRANCH"
  echo "[dry-run] title: $title"
  echo "[dry-run] body:  $body"
  exit 0
fi

gh pr create \
  --head "$branch" \
  --base "$BASE_BRANCH" \
  --title "$title" \
  --body "$body"
