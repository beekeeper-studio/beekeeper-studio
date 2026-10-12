#!/bin/bash

# Use $(...) for command substitution to capture output of find command
# Docker-DB specs live in two trees while the jest -> vitest migration is in
# progress: jest specs in tests/integration, migrated ones in tests/vitest.
FILES=$(find apps/studio/tests/integration/lib/db apps/studio/tests/vitest/integration/lib/db -name "*spec.*")

# Convert output to a JSON array of arrays with filename and full path
JSON=$(echo "$FILES" | jq -Rsc 'split("\n") | map(select(. != "") | [(. | split("/") | last), .])')

echo "$JSON"