#!/bin/bash

set -euxo pipefail

# Use $(...) for command substitution
FILES=$(find apps/studio/tests/integration/lib/db -name "*spec.js")
# Properly handle newline characters and convert to JSON array
JSON=$(echo "$FILES" | jq -R -s 'split("\n")[:-1]')

echo "$JSON"
