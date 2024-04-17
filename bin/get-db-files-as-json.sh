#!/bin/bash

# Use $(...) for command substitution to capture output of find command
FILES=$(find apps/studio/tests/integration/lib/db -name "*spec.*")

# Convert output to a JSON array of arrays with filename and full path
JSON=$(echo "$FILES" | jq -Rsc 'split("\n") | map(select(. != "") | [(. | split("/") | last), .])')

echo "$JSON"