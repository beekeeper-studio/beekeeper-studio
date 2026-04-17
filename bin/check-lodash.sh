#!/bin/bash

ROOT_DIR="${1:-.}"
has_issues=0

echo "Scanning directory (excluding node_modules, dist, dist_electron): $ROOT_DIR"

# Use process substitution to avoid subshell issue
while IFS= read -r file; do
  if grep -qE '\W_\.[a-zA-Z0-9_]+' "$file"; then
    if ! grep -qE "import\s+_\s+from\s+['\"]lodash['\"]" "$file"; then
      echo "❌ Missing lodash import in: $file"
      has_issues=1
    fi
  fi
done < <(
  find "$ROOT_DIR" \
    -type d \( -name node_modules -o -name dist -o -name dist_electron \) -prune -false -o \
    -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \)
)

if [[ $has_issues -eq 1 ]]; then
  echo "💥 One or more files use lodash but do not import it properly."
  exit 1
else
  echo "✅ All files look good — lodash usage is correctly imported."
  exit 0
fi
