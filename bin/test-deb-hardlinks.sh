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
echo "with separate filesystems for /opt and /tmp."
echo ""
echo "Background: Hardlinks cannot cross filesystem boundaries. If the package"
echo "uses hardlinks during installation, it will fail when /opt and /tmp are"
echo "on different filesystems."
echo ""

# Run container with separate tmpfs mounts for /opt and /tmp
# /var stays on the main filesystem so apt can work
docker run --rm --privileged \
  --tmpfs /opt:rw,size=2G \
  --tmpfs /tmp:rw,size=1G \
  -v "$DEB_FILE:/deb-package/$DEB_FILENAME:ro" \
  ubuntu:22.04 \
  bash -c "
    set -euxo pipefail

    # Show filesystem info for verification
    echo '=== Filesystem Information ==='
    df -h /opt /tmp
    echo ''

    # Verify filesystems are separate by checking mount points
    echo '=== Verifying Separate Filesystems ==='
    OPT_MOUNT=\$(df /opt | tail -n1 | awk '{print \$6}')
    TMP_MOUNT=\$(df /tmp | tail -n1 | awk '{print \$6}')

    echo \"Mount point for /opt:  \$OPT_MOUNT\"
    echo \"Mount point for /tmp:  \$TMP_MOUNT\"
    echo ''

    # Both should be on their own mount points (/opt and /tmp)
    if [ \"\$OPT_MOUNT\" == \"/opt\" ] && [ \"\$TMP_MOUNT\" == \"/tmp\" ]; then
      echo '✓ Filesystems are separate (different mount points)'
      echo '  This will catch hardlinks issues during installation'
    else
      echo 'ERROR: Filesystems are NOT properly separated!'
      exit 1
    fi
    echo ''

    # Install the package
    echo '=== Installing DEB Package ==='
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y /deb-package/$DEB_FILENAME

    # Verify installation
    echo ''
    echo '=== Verifying Installation ==='

    # Check package is installed
    if ! apt list --installed 2>/dev/null | grep -q beekeeper-studio; then
      echo '✗ ERROR: Package not found in installed packages'
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

    # Check binary has executable permissions (at source, not via symlink)
    if [ ! -x '/opt/Beekeeper Studio/beekeeper-studio' ]; then
      echo '⚠ Warning: Binary does not have execute permissions'
      echo '  (This is a tmpfs limitation, not a hardlinks issue)'
    else
      echo '✓ Binary has executable permissions'
    fi

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
