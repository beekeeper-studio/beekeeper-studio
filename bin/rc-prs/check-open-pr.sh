#!/bin/bash
#
# Check whether an open PR already exists for a branch into the base branch.
#
# Prints the matching PR(s) to stdout. Exit codes:
#   0  at least one open PR exists
#   1  no open PR exists
#   2  the gh query failed (auth/network/etc) — result is unknown
#
# Usage:
#   check-open-pr.sh <branch>
#
# Env:
#   BASE_BRANCH   target branch of the PR (default: master)
#
# Requires the `gh` CLI to be authenticated (gh auth login, or GH_TOKEN set).

set -euo pipefail

BASE_BRANCH="${BASE_BRANCH:-master}"
branch="${1:?usage: check-open-pr.sh <branch>}"

# Distinguish "gh said there are none" from "gh failed to answer". Treating a
# failed query as "none" would let the caller open a duplicate PR.
if ! matches=$(gh pr list --head "$branch" --base "$BASE_BRANCH" --state open \
  --json number,url --jq '.[] | "#\(.number) \(.url)"'); then
  echo "error: gh pr list failed for $branch" >&2
  exit 2
fi

if [ -n "$matches" ]; then
  echo "$matches"
  exit 0
else
  echo "No open PR for $branch into $BASE_BRANCH"
  exit 1
fi
