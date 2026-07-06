#!/bin/bash
# Self-contained test for publish_rpm.sh.
#
# Proves that publishing a new release keeps the previously published releases
# in the repo, WITHOUT the script needing the old .rpm files on disk (the whole
# point of the incremental publish).
#
# Requires: createrepo_c, rpmbuild, rpm  (Debian/Ubuntu: apt-get install createrepo-c rpm)
# Real aws/rpmsign/gpg are stubbed out, so no credentials or network are needed.
#
# Usage: bash .github/scripts/test_publish_rpm.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLISH="$SCRIPT_DIR/publish_rpm.sh"

for cmd in createrepo_c rpmbuild rpm; do
    command -v "$cmd" >/dev/null || { echo "Missing required tool: $cmd"; exit 1; }
done

WORK=$(mktemp -d -t rpm-publish-test-XXXXXX)
trap 'rm -rf "$WORK"' EXIT

# ---------------------------------------------------------------------------
# 1. Build a few tiny real RPMs (two separate releases).
# ---------------------------------------------------------------------------
build_rpm() { # version
    local ver="$1"
    cat > "$WORK/spec" <<EOF
Name: beekeeper-studio
Version: $ver
Release: 1
Summary: test
License: GPL
BuildArch: x86_64
%description
test
%files
EOF
    rpmbuild --define "_topdir $WORK/rpmbuild" -bb "$WORK/spec" >/dev/null 2>&1
}
build_rpm 5.1.0
build_rpm 5.2.0
RPMDIR="$WORK/rpmbuild/RPMS"

# ---------------------------------------------------------------------------
# 2. Seed a fake R2 bucket with the FIRST release (5.1.0) + full metadata.
#    The fake bucket is a local dir; s3://beekeeper-rpm-repo -> $FAKE_R2.
# ---------------------------------------------------------------------------
FAKE_R2="$WORK/r2"
mkdir -p "$FAKE_R2/repo/x86_64"
cp "$RPMDIR/x86_64/beekeeper-studio-5.1.0-1.x86_64.rpm" "$FAKE_R2/repo/x86_64/"
createrepo_c "$FAKE_R2/repo" >/dev/null 2>&1

# ---------------------------------------------------------------------------
# 3. Stub aws / rpmsign / gpg so the real publish_rpm.sh runs offline.
# ---------------------------------------------------------------------------
BIN="$WORK/bin"; mkdir -p "$BIN"

cat > "$BIN/aws" <<'AWS'
#!/bin/bash
# Minimal stub for: aws s3 sync SRC DST --endpoint-url URL [--delete]
pos=(); del=0; skip=0
for a in "$@"; do
  if [ "$skip" = 1 ]; then skip=0; continue; fi
  case "$a" in
    s3|sync) ;;
    --endpoint-url) skip=1 ;;
    --delete) del=1 ;;
    *) pos+=("$a") ;;
  esac
done
map() { echo "$1" | sed "s#s3://beekeeper-rpm-repo#$FAKE_R2_ROOT#"; }
src=$(map "${pos[0]}"); dst=$(map "${pos[1]}")
[ -d "$src" ] || exit 0
mkdir -p "$dst"
if [ "$del" = 1 ]; then
  # emulate `sync --delete`: mirror src into dst exactly
  find "$dst" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
fi
cp -a "$src"/. "$dst"/
AWS

cat > "$BIN/rpmsign" <<'SIGN'
#!/bin/bash
echo "[stub rpmsign] $*"
SIGN

cat > "$BIN/gpg" <<'GPG'
#!/bin/bash
# emulate `--output FILE` by writing a dummy signature there
prev=""; out=""
for a in "$@"; do [ "$prev" = "--output" ] && out="$a"; prev="$a"; done
[ -n "$out" ] && echo "stub-signature" > "$out"
echo "[stub gpg] $*"
GPG

chmod +x "$BIN/aws" "$BIN/rpmsign" "$BIN/gpg"

# ---------------------------------------------------------------------------
# 4. Run the REAL publish script for the SECOND release (5.2.0).
#    Note: the 5.1.0 .rpm file is intentionally NOT passed and NOT on disk.
# ---------------------------------------------------------------------------
echo ">>> Publishing 5.2.0 on top of an existing 5.1.0 repo..."
FAKE_R2_ROOT="$FAKE_R2" \
PATH="$BIN:$PATH" \
GPG_KEY_ID="STUBKEY" \
R2_BUCKET="beekeeper-rpm-repo/repo" \
R2_ENDPOINT="https://example.r2.cloudflarestorage.com" \
    bash "$PUBLISH" \
        "$RPMDIR/x86_64/beekeeper-studio-5.2.0-1.x86_64.rpm" \
        >/dev/null 2>&1

# ---------------------------------------------------------------------------
# 5. Assert the final repo metadata contains ALL releases, each exactly once.
# ---------------------------------------------------------------------------
REF=$(grep -o 'repodata/[a-f0-9]*-primary\.xml\.gz' "$FAKE_R2/repo/repodata/repomd.xml" | head -1)
LOCS=$(zcat "$FAKE_R2/repo/$REF" | grep -o '<location href="[^"]*"' | sed 's/<location href="//; s/"$//' | sort)

echo
echo ">>> Packages in the final published repo:"
echo "$LOCS" | sed 's/^/    /'

expected="x86_64/beekeeper-studio-5.1.0-1.x86_64.rpm
x86_64/beekeeper-studio-5.2.0-1.x86_64.rpm"
expected=$(echo "$expected" | sort)

count=$(echo "$LOCS" | grep -c .)
echo
if [ "$LOCS" = "$expected" ] && [ "$count" -eq 2 ]; then
    echo "PASS: final repo contains both releases (incl. the old 5.1.0 whose .rpm was never downloaded)."
    exit 0
else
    echo "FAIL: expected 2 releases:"
    echo "$expected" | sed 's/^/    /'
    exit 1
fi
