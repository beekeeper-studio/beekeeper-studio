#!/bin/bash

# Use $(...) for command substitution
FILES=$(find apps/studio/tests/integration/lib/db -name "*spec.js")
# Convert to JSON array directly
JSON=$(echo "$FILES" | jq -Rsc 'split("\n") | if last == "" then .[:-1] else . end')

echo "$JSON"
