#! /bin/bash

# New specs must be vitest specs in apps/studio/tests/vitest/ (see
# apps/studio/tests/VITEST_MIGRATION.md). Fails if the branch adds a spec file
# to one of the legacy jest trees (anywhere else under apps/studio/tests/).
# E2E specs (apps/studio/tests/e2e/, playwright) are exempt.

set -euo pipefail

BASE_REF="${GITHUB_BASE_REF:-master}"

git fetch --quiet origin "$BASE_REF"

NEW_JEST_SPECS=$(git diff --name-only --diff-filter=A "origin/$BASE_REF...HEAD" -- 'apps/studio/tests' \
  | grep -E '\.spec\.[cm]?[jt]sx?$' \
  | grep -vE '^apps/studio/tests/(vitest|e2e)/' || true)

if [ -n "$NEW_JEST_SPECS" ]; then
  echo "New spec files must be vitest specs under apps/studio/tests/vitest/:"
  echo "$NEW_JEST_SPECS"
  echo "See apps/studio/tests/VITEST_MIGRATION.md for how to write one."
  exit 1
fi

echo "no new jest specs"
