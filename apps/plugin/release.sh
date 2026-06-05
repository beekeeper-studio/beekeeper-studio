#!/bin/bash

set -e

# Releases can only be cut from the main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "🚫 You're on '$CURRENT_BRANCH'. Releases must be made from the main branch, so switch to main and try again."
  exit 1
fi

# Releases must go to the official repository, not a fork
EXPECTED_ORIGIN="beekeeper-studio/plugin"
ORIGIN_URL=$(git remote get-url origin 2>/dev/null || true)
if [[ "$ORIGIN_URL" != *"$EXPECTED_ORIGIN"* ]]; then
  echo "🚫 Your 'origin' points to '$ORIGIN_URL'. Releases must be published to the official repository ($EXPECTED_ORIGIN), so update your origin and try again."
  exit 1
fi

# Spinner function
spin() {
  local pid=$1
  local msg=$2
  local spinchars='|/-\'
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r%s %c" "$msg" "${spinchars:i++%4:1}"
    sleep 0.1
  done
  printf "\r%s done\n" "$msg"
}

# Sync with remote so we release from the latest code
git fetch &>/dev/null &
spin $! "Syncing with remote..."

# Check if branch is behind remote
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})
BASE=$(git merge-base @ @{u})

if [[ "$LOCAL" != "$REMOTE" ]]; then
  if [[ "$LOCAL" == "$BASE" ]]; then
    echo "⚠️  Your branch is behind the remote. Please pull the latest changes first."
  else
    echo "⚠️  Your branch has diverged from the remote. Please resolve this first."
  fi
  exit 1
fi

# Split a version into its release (X.Y.Z) and prerelease (e.g. beta.N) parts
split_version() {
  REL="${1%%-*}"
  if [[ "$1" == *-* ]]; then
    PRE="${1#*-}"
  else
    PRE=""
  fi
}

# Compare semver with optional prerelease (returns 0 if $1 > $2, 1 if equal, 2 if $1 < $2)
semver_compare() {
  if [[ "$1" == "$2" ]]; then
    return 1
  fi

  local rel1 pre1 rel2 pre2
  split_version "$1"; rel1="$REL"; pre1="$PRE"
  split_version "$2"; rel2="$REL"; pre2="$PRE"

  # Compare the release parts numerically
  local IFS=.
  local i ver1=($rel1) ver2=($rel2)
  for ((i=0; i<3; i++)); do
    if ((${ver1[i]:-0} > ${ver2[i]:-0})); then
      return 0
    elif ((${ver1[i]:-0} < ${ver2[i]:-0})); then
      return 2
    fi
  done

  # Release parts equal: a stable version outranks a prerelease
  if [[ -z "$pre1" && -n "$pre2" ]]; then
    return 0
  elif [[ -n "$pre1" && -z "$pre2" ]]; then
    return 2
  fi

  # Both prereleases: compare the trailing number (e.g. beta.3 > beta.2)
  local num1="${pre1##*.}" num2="${pre2##*.}"
  if ((num1 > num2)); then
    return 0
  elif ((num1 < num2)); then
    return 2
  fi
  return 1
}

# Get current version
CURRENT_VERSION=$(jq -r '.version' package.json)
echo "Current version: $CURRENT_VERSION"

# Suggest the next version: bump the beta number if on a beta, else bump patch
split_version "$CURRENT_VERSION"
if [[ -n "$PRE" ]]; then
  PRE_LABEL="${PRE%.*}"
  PRE_NUM="${PRE##*.}"
  NEXT_VERSION="$REL-$PRE_LABEL.$((PRE_NUM + 1))"
else
  IFS='.' read -r MAJOR MINOR PATCH <<< "$REL"
  NEXT_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
fi

# Prompt for new version
while true; do
  echo "Enter new version (or press Enter for $NEXT_VERSION):"
  read -r INPUT

  if [[ -z "$INPUT" ]]; then
    NEW_VERSION="$NEXT_VERSION"
    break
  elif [[ ! "$INPUT" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?$ ]]; then
    echo "Invalid version: $INPUT. Please enter a semver like X.Y.Z or X.Y.Z-beta.N"
  elif ! semver_compare "$INPUT" "$CURRENT_VERSION"; then
    echo "Version $INPUT must be greater than $CURRENT_VERSION"
  else
    NEW_VERSION="$INPUT"
    break
  fi
done

echo "New version: $NEW_VERSION"

# Update package.json
jq --arg v "$NEW_VERSION" '.version = $v' package.json > package.json.tmp && mv package.json.tmp package.json

echo "📝 Set the project to version $NEW_VERSION"

# Commit and tag the new version
git add package.json
git commit -m "chore: bump version to $NEW_VERSION"
git tag "v$NEW_VERSION"

echo "💾 Recorded version $NEW_VERSION locally"

# Push commit and tag
git push && git push origin "v$NEW_VERSION"

echo "🚀 Pushed commit and tag v$NEW_VERSION to remote"
if [[ "$NEW_VERSION" == *beta* ]]; then
  echo "✅ Done! GitHub Actions will build and publish v$NEW_VERSION to npm under the 'beta' tag."
else
  echo "✅ Done! GitHub Actions will build and publish v$NEW_VERSION to npm as the latest stable release."
fi
