#!/bin/bash
#
# Orchestrator: for every rc-* branch that has commits not in master and no
# open PR yet, open a PR into master. This is what the daily GitHub Action runs,
# but it works the same way locally.
#
# Env:
#   REMOTE        remote name (default: origin)
#   BASE_BRANCH   target branch (default: master)
#   DRY_RUN       if set to 1, don't actually create PRs
#   SKIP_FETCH    if set to 1, don't fetch before checking (useful offline)
#
# GitHub Actions integration (all optional, only used when the vars are set):
#   GITHUB_OUTPUT        step outputs are appended here (counts + opened PRs)
#   GITHUB_STEP_SUMMARY  a markdown summary is appended here for the run UI
#
# Requires the `gh` CLI to be authenticated for PR operations.
#
# Exits non-zero if any branch could not be processed, so CI surfaces problems
# rather than silently doing nothing.

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE="${REMOTE:-origin}"
BASE_BRANCH="${BASE_BRANCH:-master}"
export REMOTE BASE_BRANCH

# --- tallies, populated as we go --------------------------------------------
opened=()        # "branch url" for each PR opened (url may be "(dry-run)")
existing=()      # branches skipped because a PR already exists
not_ahead=()     # branches skipped because they have nothing to merge
errors=()        # branches we couldn't process

log() { echo "$@"; }

if [ "${SKIP_FETCH:-}" != "1" ]; then
  # Fetch every branch explicitly. actions/checkout can leave a single-branch
  # refspec configured, in which case a bare `git fetch` would never create the
  # origin/rc-* tracking refs this script relies on.
  log "Fetching branches from $REMOTE..."
  git fetch "$REMOTE" "+refs/heads/*:refs/remotes/$REMOTE/*" --prune
fi

branches=$("$DIR/list-rc-branches.sh")
if [ -z "$branches" ]; then
  log "No rc-* branches found."
  branches=""
fi

branch_count=0
for branch in $branches; do
  branch_count=$((branch_count + 1))
  log ""
  log "=== $branch ==="

  # check-branch-ahead: 0 = ahead, 1 = not ahead, 2 = error
  set +e
  ahead=$("$DIR/check-branch-ahead.sh" "$branch")
  rc=$?
  set -e
  if [ "$rc" -eq 1 ]; then
    log "  no commits ahead of $BASE_BRANCH, skipping"
    not_ahead+=("$branch")
    continue
  elif [ "$rc" -ne 0 ]; then
    log "  ERROR checking commits for $branch (exit $rc)" >&2
    errors+=("$branch")
    continue
  fi
  log "  $ahead commit(s) ahead of $BASE_BRANCH"

  # check-open-pr: 0 = PR exists, 1 = none, 2 = error
  set +e
  pr_info=$("$DIR/check-open-pr.sh" "$branch" 2>/dev/null)
  prc=$?
  set -e
  if [ "$prc" -eq 0 ]; then
    log "  open PR already exists ($pr_info), skipping"
    existing+=("$branch")
    continue
  elif [ "$prc" -ne 1 ]; then
    log "  ERROR checking existing PRs for $branch (exit $prc)" >&2
    errors+=("$branch")
    continue
  fi

  log "  opening PR..."
  set +e
  out=$("$DIR/open-rc-pr.sh" "$branch" "$ahead")
  orc=$?
  set -e
  echo "$out" | sed 's/^/  /'
  if [ "$orc" -ne 0 ]; then
    log "  ERROR opening PR for $branch (exit $orc)" >&2
    errors+=("$branch")
    continue
  fi
  url=$(printf '%s\n' "$out" | grep -oE 'https://github\.com/[^ ]+/pull/[0-9]+' | head -n1 || true)
  opened+=("$branch ${url:-(dry-run)}")
done

# --- summary ----------------------------------------------------------------
log ""
log "------------------------------------------------------------"
log "Checked:            $branch_count branch(es)"
log "PRs opened:         ${#opened[@]}"
log "Skipped (PR open):  ${#existing[@]}"
log "Skipped (in sync):  ${#not_ahead[@]}"
log "Errors:             ${#errors[@]}"
for line in "${opened[@]}";  do log "  opened: $line"; done
for b    in "${errors[@]}";  do log "  error:  $b";    done

# --- GitHub Actions step outputs --------------------------------------------
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "checked_count=$branch_count"
    echo "opened_count=${#opened[@]}"
    echo "existing_count=${#existing[@]}"
    echo "not_ahead_count=${#not_ahead[@]}"
    echo "error_count=${#errors[@]}"
    echo "opened_prs<<__BKS_EOF__"
    printf '%s\n' "${opened[@]}"
    echo "__BKS_EOF__"
  } >> "$GITHUB_OUTPUT"
fi

# --- GitHub Actions job summary (markdown, shown in the run UI) --------------
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### RC branch PR sync"
    echo ""
    echo "| Result | Count |"
    echo "| --- | --- |"
    echo "| Branches checked | $branch_count |"
    echo "| PRs opened | ${#opened[@]} |"
    echo "| Skipped (PR already open) | ${#existing[@]} |"
    echo "| Skipped (in sync with $BASE_BRANCH) | ${#not_ahead[@]} |"
    echo "| Errors | ${#errors[@]} |"
    if [ "${#opened[@]}" -gt 0 ]; then
      echo ""
      echo "**Opened:**"
      printf -- '- %s\n' "${opened[@]}"
    fi
    if [ "${#errors[@]}" -gt 0 ]; then
      echo ""
      echo "**Errors:**"
      printf -- '- %s\n' "${errors[@]}"
    fi
  } >> "$GITHUB_STEP_SUMMARY"
fi

[ "${#errors[@]}" -eq 0 ]
