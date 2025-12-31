#!/bin/bash
# Tests that the .deb package can be installed on a system with separate filesystems
# This prevents regressions of the hardlinks issue fixed in PR #3756

set -euo pipefail

DEB_FILE="${1:-}"

if [ -z "$DEB_FILE" ] || [ ! -f "$DEB_FILE" ]; then
  echo "Usage: $0 <path-to-deb-file>"
  echo ""
  echo "Example: $0 apps/studio/dist_electron/beekeeper-studio_5.5.3_amd64.deb"
  exit 1
fi

# Get absolute path to deb file
DEB_FILE=$(realpath "$DEB_FILE")
DEB_FILENAME=$(basename "$DEB_FILE")

echo "=================================="
echo "DEB Package Hardlinks Test"
echo "=================================="
echo "Testing: $DEB_FILE"
echo ""
echo "This test verifies that the .deb package can be installed on a system"
echo "with separate filesystems for /opt, /var, /tmp, and /home."
echo ""
echo "Background: Hardlinks cannot cross filesystem boundaries. If the package"
echo "uses hardlinks, installation will fail when these directories are on"
echo "different filesystems."
echo ""

# Run container with separate tmpfs mounts for each critical directory
docker run --rm --privileged \
  --tmpfs /opt:rw,size=2G \
  --tmpfs /var:rw,size=2G \
  --tmpfs /tmp:rw,size=1G \
  --tmpfs /home:rw,size=1G \
  -v "$DEB_FILE:/tmp/$DEB_FILENAME:ro" \
  ubuntu:22.04 \
  bash -c "
    set -euxo pipefail

    # Show filesystem info for verification
    echo '=== Filesystem Information ==='
    df -h /opt /var /tmp /home
    echo ''

    # Verify filesystems are separate
    echo '=== Verifying Separate Filesystems ==='
    OPT_DEV=\$(df /opt | tail -n1 | awk '{print \$1}')
    VAR_DEV=\$(df /var | tail -n1 | awk '{print \$1}')
    TMP_DEV=\$(df /tmp | tail -n1 | awk '{print \$1}')
    HOME_DEV=\$(df /home | tail -n1 | awk '{print \$1}')

    echo \"Device for /opt:  \$OPT_DEV\"
    echo \"Device for /var:  \$VAR_DEV\"
    echo \"Device for /tmp:  \$TMP_DEV\"
    echo \"Device for /home: \$HOME_DEV\"
    echo ''

    if [ \"\$OPT_DEV\" == \"\$VAR_DEV\" ] || [ \"\$OPT_DEV\" == \"\$TMP_DEV\" ]; then
      echo 'WARNING: Not all filesystems are separate! Test may not catch hardlinks issues.'
    else
      echo '✓ Filesystems are separate (different devices)'
    fi
    echo ''

    # Install the package
    echo '=== Installing DEB Package ==='
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y /tmp/$DEB_FILENAME

    # Verify installation
    echo ''
    echo '=== Verifying Installation ==='

    # Check package is installed
    if ! dpkg -l | grep -q beekeeper-studio; then
      echo '✗ ERROR: Package not found in dpkg database'
      exit 1
    fi
    echo '✓ Package is installed'

    # Check binary exists
    if [ ! -f '/opt/Beekeeper Studio/beekeeper-studio' ]; then
      echo '✗ ERROR: Binary not found at /opt/Beekeeper Studio/beekeeper-studio'
      exit 1
    fi
    echo '✓ Binary exists at /opt/Beekeeper Studio/beekeeper-studio'

    # Check symlink was created
    if [ ! -L '/usr/bin/beekeeper-studio' ]; then
      echo '✗ ERROR: Symlink not found at /usr/bin/beekeeper-studio'
      exit 1
    fi
    echo '✓ Symlink exists at /usr/bin/beekeeper-studio'

    # Check symlink target
    LINK_TARGET=\$(readlink '/usr/bin/beekeeper-studio')
    if [ \"\$LINK_TARGET\" != '/opt/Beekeeper Studio/beekeeper-studio' ]; then
      echo \"✗ ERROR: Symlink points to wrong target: \$LINK_TARGET\"
      exit 1
    fi
    echo '✓ Symlink points to correct target'

    # Check symlink resolves and is executable
    if [ ! -x '/usr/bin/beekeeper-studio' ]; then
      echo '✗ ERROR: Binary is not executable via symlink'
      exit 1
    fi
    echo '✓ Binary is executable via symlink'

    echo ''
    echo '=== All checks passed! ==='
  "

EXIT_CODE=$?

echo ""
echo "=================================="
if [ $EXIT_CODE -eq 0 ]; then
  echo "✓ SUCCESS"
  echo "=================================="
  echo ""
  echo "DEB package installs correctly on separate filesystems."
  echo "No hardlinks regression detected."
  exit 0
else
  echo "✗ FAILURE"
  echo "=================================="
  echo ""
  echo "DEB package failed to install on separate filesystems."
  echo "This indicates a hardlinks regression!"
  echo ""
  echo "The package may be using hardlinks across filesystem boundaries,"
  echo "which will fail on systems where /opt, /var, /tmp, and /home"
  echo "are on different drives or partitions."
  echo ""
  echo "See PR #3756 for the original fix (FPM upgrade to 1.17.0)"
  exit 1
fi
