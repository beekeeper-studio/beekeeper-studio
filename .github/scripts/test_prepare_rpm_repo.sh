#!/bin/bash
# Self-contained test for prepare_rpm_repo.sh.
#
# Proves that publishing a new release keeps the previously published releases in
# the repo WITHOUT their .rpm files being present on disk -- the whole point of
# the incremental publish.
#
# No S3 and no network: prepare_rpm_repo.sh operates purely on local directories,
# so the test just hands it a directory directly. rpmsign/gpg are stubbed so no
# signing key is needed.
#
# Requires: createrepo_c, rpmbuild, rpm  (Debian/Ubuntu: apt-get install createrepo-c rpm)
# Usage:    bash .github/scripts/test_prepare_rpm_repo.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PREPARE="$SCRIPT_DIR/prepare_rpm_repo.sh"

for cmd in createrepo_c rpmbuild rpm; do
    command -v "$cmd" >/dev/null || { echo "Missing required tool: $cmd"; exit 1; }
done

WORK=$(mktemp -d -t rpm-prepare-test-XXXXXX)
trap 'rm -rf "$WORK"' EXIT

# ---------------------------------------------------------------------------
# 1. Build two tiny real RPMs (two separate releases).
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
RPMDIR="$WORK/rpmbuild/RPMS/x86_64"

# ---------------------------------------------------------------------------
# 2. Stub the signing tools so no GPG key is required.
# ---------------------------------------------------------------------------
BIN="$WORK/bin"; mkdir -p "$BIN"
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
chmod +x "$BIN/rpmsign" "$BIN/gpg"

# ---------------------------------------------------------------------------
# 3. Build the "existing repo" the sync-down step would leave on disk: only the
#    repodata/ metadata for the already-published 5.1.0, and NOT its .rpm file.
# ---------------------------------------------------------------------------
REPO="$WORK/repo"; mkdir -p "$REPO/x86_64"
cp "$RPMDIR/beekeeper-studio-5.1.0-1.x86_64.rpm" "$REPO/x86_64/"
createrepo_c "$REPO" >/dev/null 2>&1
# Drop the old package file: after a real `aws s3 sync ... repodata/` only the
# metadata is on disk, never the back catalogue of .rpm files.
rm -rf "$REPO/x86_64"

# ---------------------------------------------------------------------------
# 4. Run the REAL prep script to publish 5.2.0 into that repo directory.
# ---------------------------------------------------------------------------
echo ">>> prepare_rpm_repo.sh: publishing 5.2.0 on top of existing 5.1.0 metadata..."
PATH="$BIN:$PATH" GPG_KEY_ID="STUBKEY" \
    bash "$PREPARE" "$REPO" "$RPMDIR/beekeeper-studio-5.2.0-1.x86_64.rpm" >/dev/null 2>&1

# ---------------------------------------------------------------------------
# 5. Assert the resulting metadata lists BOTH releases, each exactly once.
# ---------------------------------------------------------------------------
REF=$(grep -o 'repodata/[a-f0-9]*-primary\.xml\.gz' "$REPO/repodata/repomd.xml" | head -1)
LOCS=$(zcat "$REPO/$REF" | grep -o '<location href="[^"]*"' | sed 's/<location href="//; s/"$//' | sort)

echo
echo ">>> Packages in the prepared repo metadata:"
echo "$LOCS" | sed 's/^/    /'

expected=$(printf '%s\n' \
    "x86_64/beekeeper-studio-5.1.0-1.x86_64.rpm" \
    "x86_64/beekeeper-studio-5.2.0-1.x86_64.rpm" | sort)
count=$(echo "$LOCS" | grep -c .)

echo
if [ "$LOCS" = "$expected" ] && [ "$count" -eq 2 ]; then
    echo "PASS: prepared repo lists both releases (old 5.1.0 carried forward without its .rpm on disk)."
    exit 0
else
    echo "FAIL: expected 2 releases:"
    echo "$expected" | sed 's/^/    /'
    exit 1
fi
