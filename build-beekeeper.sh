Beekeeper

#!/bin/bash

#===============================================================================
# Beekeeper Studio Fork - Cross-Platform Build Script
#===============================================================================
# This script builds the Beekeeper Studio fork for Mac, Windows, and/or Linux
# and copies the installers to ~/Downloads/beekeeper-releases/{tag}
#
# Prerequisites (one-time setup):
#
#   ALL PLATFORMS:
#     1. Install nvm:    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
#     2. Install Node:   nvm install 20
#     3. Install Yarn:   npm install -g yarn
#
#   MACOS:
#     4. Install Python setuptools: brew install python-setuptools
#
#   LINUX (Ubuntu/Debian):
#     4. Install build tools: sudo apt-get install build-essential
#     5. For DEB/RPM builds: sudo apt-get install ruby ruby-dev rpm
#        Then: sudo gem install fpm
#     6. For Snap builds: sudo apt-get install snapcraft
#
#   WINDOWS:
#     - Use WSL2 with Ubuntu, or
#     - Use Git Bash/PowerShell with Node.js installed natively
#     - For native Windows: Install Node.js 20 from nodejs.org
#
# Usage:
#   ./build-beekeeper.sh                      # Build for current platform
#   ./build-beekeeper.sh --mac                # Build for macOS only
#   ./build-beekeeper.sh --linux              # Build for Linux only
#   ./build-beekeeper.sh --win                # Build for Windows only
#   ./build-beekeeper.sh --all                # Build for all platforms (cross-compile)
#   ./build-beekeeper.sh --mac --linux        # Build for Mac and Linux
#   ./build-beekeeper.sh --sync               # Sync with upstream first
#   ./build-beekeeper.sh --clean              # Clean node_modules before build
#   ./build-beekeeper.sh --sync --clean --all # Full clean build for all platforms
#
# Notes on Cross-Compilation:
#   - macOS can build for: macOS (native), Linux (with limitations)
#   - Linux can build for: Linux (native), Windows (with Wine)
#   - Windows can build for: Windows (native)
#   - For best results, build on each target platform natively
#===============================================================================

set -e  # Exit on any error

# Get the directory where this script is located (repository root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

# Configuration
OUTPUT_BASE_DIR="$HOME/Downloads/beekeeper-releases"
REQUIRED_NODE_VERSION="20"
UPSTREAM_REPO="https://github.com/beekeeper-studio/beekeeper-studio.git"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Build targets
BUILD_MAC=false
BUILD_LINUX=false
BUILD_WIN=false
SYNC_UPSTREAM=false
CLEAN_BUILD=false
AUTO_DETECT_PLATFORM=true

# Detect current OS
detect_os() {
    case "$(uname -s)" in
        Darwin*)    CURRENT_OS="mac" ;;
        Linux*)     CURRENT_OS="linux" ;;
        MINGW*|MSYS*|CYGWIN*) CURRENT_OS="win" ;;
        *)          CURRENT_OS="unknown" ;;
    esac
}

# Parse arguments
parse_args() {
    for arg in "$@"; do
        case $arg in
            --mac)
                BUILD_MAC=true
                AUTO_DETECT_PLATFORM=false
                ;;
            --linux)
                BUILD_LINUX=true
                AUTO_DETECT_PLATFORM=false
                ;;
            --win|--windows)
                BUILD_WIN=true
                AUTO_DETECT_PLATFORM=false
                ;;
            --all)
                BUILD_MAC=true
                BUILD_LINUX=true
                BUILD_WIN=true
                AUTO_DETECT_PLATFORM=false
                ;;
            --sync)
                SYNC_UPSTREAM=true
                ;;
            --clean)
                CLEAN_BUILD=true
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
        esac
    done

    # If no platform specified, build for current platform
    if [ "$AUTO_DETECT_PLATFORM" = true ]; then
        case "$CURRENT_OS" in
            mac)    BUILD_MAC=true ;;
            linux)  BUILD_LINUX=true ;;
            win)    BUILD_WIN=true ;;
        esac
    fi
}

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Build Options:"
    echo "  --mac          Build for macOS (DMG, ZIP)"
    echo "  --linux        Build for Linux (AppImage, DEB, RPM, Snap)"
    echo "  --win          Build for Windows (NSIS installer, portable)"
    echo "  --all          Build for all platforms"
    echo ""
    echo "Other Options:"
    echo "  --sync         Sync with upstream repository before building"
    echo "  --clean        Remove node_modules and reinstall dependencies"
    echo "  --help, -h     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                        # Build for current platform"
    echo "  $0 --mac                  # Build for macOS only"
    echo "  $0 --linux --win          # Build for Linux and Windows"
    echo "  $0 --all --clean          # Clean build for all platforms"
    echo "  $0 --sync --clean --mac   # Full clean Mac build with upstream sync"
    echo ""
    echo "Notes:"
    echo "  - Cross-compilation has limitations. For best results, build on each"
    echo "    target platform natively."
    echo "  - Windows builds on Linux require Wine to be installed."
    echo "  - Linux builds require: ruby, fpm, rpm (for DEB/RPM packages)"
}

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------

print_step() {
    echo -e "\n${BLUE}==>${NC} ${GREEN}$1${NC}"
}

print_substep() {
    echo -e "    ${CYAN}→${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}Warning:${NC} $1"
}

print_error() {
    echo -e "${RED}Error:${NC} $1"
}

print_info() {
    echo -e "${CYAN}Info:${NC} $1"
}

check_prerequisites() {
    print_step "Checking prerequisites..."

    # Check if nvm is installed (Unix-like systems)
    if [ "$CURRENT_OS" != "win" ]; then
        export NVM_DIR="$HOME/.nvm"
        if [ -s "$NVM_DIR/nvm.sh" ]; then
            source "$NVM_DIR/nvm.sh"
            echo "  ✓ nvm found"
        else
            print_warning "nvm is not installed. Checking for system Node.js..."
            if ! command -v node &> /dev/null; then
                print_error "Node.js is not installed. Please install nvm or Node.js $REQUIRED_NODE_VERSION"
                echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
                exit 1
            fi
        fi
    fi

    # Check Node.js version
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge "$REQUIRED_NODE_VERSION" ]; then
            echo "  ✓ Node.js $(node -v) found"
        else
            print_warning "Node.js version $REQUIRED_NODE_VERSION+ recommended (found $(node -v))"
        fi
    fi

    # Check if yarn is installed
    if ! command -v yarn &> /dev/null; then
        print_error "yarn is not installed. Please install it first:"
        echo "  npm install -g yarn"
        exit 1
    fi
    echo "  ✓ yarn $(yarn -v) found"

    # Check if we're in a git repository
    if [ ! -d "$PROJECT_DIR/.git" ]; then
        print_error "This script must be run from within the git repository"
        exit 1
    fi
    echo "  ✓ Git repository found"

    # Check if package.json exists
    if [ ! -f "$PROJECT_DIR/package.json" ]; then
        print_error "package.json not found. Are you in the correct directory?"
        exit 1
    fi
    echo "  ✓ package.json found"

    # Platform-specific checks
    check_platform_prerequisites
}

check_platform_prerequisites() {
    if [ "$BUILD_LINUX" = true ]; then
        print_substep "Checking Linux build prerequisites..."

        # Check for fpm (needed for DEB/RPM)
        if ! command -v fpm &> /dev/null; then
            print_warning "fpm not found. DEB/RPM packages may not build."
            print_info "Install with: sudo gem install fpm"
        else
            echo "      ✓ fpm found"
        fi

        # Check for rpmbuild (needed for RPM)
        if ! command -v rpmbuild &> /dev/null; then
            print_warning "rpmbuild not found. RPM packages will not build."
            print_info "Install with: sudo apt-get install rpm (Debian/Ubuntu)"
        else
            echo "      ✓ rpmbuild found"
        fi
    fi

    if [ "$BUILD_WIN" = true ] && [ "$CURRENT_OS" != "win" ]; then
        print_substep "Checking Windows cross-compilation prerequisites..."

        # Check for Wine (needed for Windows builds on non-Windows)
        if ! command -v wine &> /dev/null; then
            print_warning "Wine not found. Windows builds may fail on non-Windows systems."
            print_info "Install with: sudo apt-get install wine (Debian/Ubuntu)"
            print_info "Or: brew install --cask wine-stable (macOS)"
        else
            echo "      ✓ wine found"
        fi
    fi
}

setup_node() {
    print_step "Setting up Node.js $REQUIRED_NODE_VERSION..."

    if [ "$CURRENT_OS" != "win" ]; then
        # Load nvm if available
        export NVM_DIR="$HOME/.nvm"
        if [ -s "$NVM_DIR/nvm.sh" ]; then
            source "$NVM_DIR/nvm.sh"
            nvm install $REQUIRED_NODE_VERSION > /dev/null 2>&1 || true
            nvm use $REQUIRED_NODE_VERSION > /dev/null 2>&1 || true
        fi
    fi

    echo "  ✓ Using Node.js $(node --version)"
}

sync_upstream() {
    if [ "$SYNC_UPSTREAM" = true ]; then
        print_step "Syncing with upstream repository..."

        cd "$PROJECT_DIR"

        # Add upstream remote if it doesn't exist
        if ! git remote | grep -q 'upstream'; then
            git remote add upstream "$UPSTREAM_REPO"
            echo "  ✓ Added upstream remote"
        fi

        # Get current branch
        CURRENT_BRANCH=$(git branch --show-current)

        # Fetch upstream
        git fetch upstream

        # Try to merge upstream/master or upstream/main
        if git show-ref --verify --quiet refs/remotes/upstream/master; then
            git merge upstream/master --no-edit
            echo "  ✓ Merged upstream/master into $CURRENT_BRANCH"
        elif git show-ref --verify --quiet refs/remotes/upstream/main; then
            git merge upstream/main --no-edit
            echo "  ✓ Merged upstream/main into $CURRENT_BRANCH"
        else
            print_warning "Could not find upstream/master or upstream/main"
        fi
    fi
}

clean_project() {
    if [ "$CLEAN_BUILD" = true ]; then
        print_step "Cleaning project..."

        cd "$PROJECT_DIR"

        # Remove node_modules directories
        rm -rf node_modules
        rm -rf apps/*/node_modules
        rm -rf packages/*/node_modules

        # Remove build artifacts
        rm -rf apps/studio/dist_electron
        rm -rf apps/studio/dist
        rm -rf apps/ui-kit/dist

        # Clear caches
        yarn cache clean 2>/dev/null || true
        rm -rf ~/.node-gyp

        echo "  ✓ Project cleaned"
    fi
}

install_dependencies() {
    print_step "Installing dependencies..."

    cd "$PROJECT_DIR"
    yarn install

    echo "  ✓ Dependencies installed"
}

build_app() {
    print_step "Building application..."

    cd "$PROJECT_DIR"

    # Build platform arguments
    BUILD_ARGS=""

    if [ "$BUILD_MAC" = true ]; then
        BUILD_ARGS="$BUILD_ARGS --mac"
        print_substep "Building for macOS..."
    fi

    if [ "$BUILD_LINUX" = true ]; then
        BUILD_ARGS="$BUILD_ARGS --linux"
        print_substep "Building for Linux..."
    fi

    if [ "$BUILD_WIN" = true ]; then
        BUILD_ARGS="$BUILD_ARGS --win"
        print_substep "Building for Windows..."
    fi

    # Run the build
    if [ -n "$BUILD_ARGS" ]; then
        yarn run electron:build $BUILD_ARGS
    else
        yarn run electron:build
    fi

    echo "  ✓ Build complete"
}

get_version() {
    cd "$PROJECT_DIR/apps/studio"
    node -p "require('./package.json').version"
}

copy_artifacts() {
    print_step "Copying build artifacts..."

    VERSION=$(get_version)
    TAG="v$VERSION"
    OUTPUT_DIR="$OUTPUT_BASE_DIR/$TAG"
    DIST_DIR="$PROJECT_DIR/apps/studio/dist_electron"

    # Create output directory
    mkdir -p "$OUTPUT_DIR"

    # Track what was copied
    COPIED_FILES=()

    # ===== macOS artifacts =====
    if [ "$BUILD_MAC" = true ]; then
        print_substep "Copying macOS artifacts..."

        # DMG files
        for DMG_FILE in "$DIST_DIR"/*.dmg; do
            if [ -f "$DMG_FILE" ]; then
                cp "$DMG_FILE" "$OUTPUT_DIR/"
                COPIED_FILES+=("$(basename "$DMG_FILE")")
                echo "      ✓ $(basename "$DMG_FILE")"
            fi
        done

        # Mac ZIP files
        for ZIP_FILE in "$DIST_DIR"/*-mac*.zip "$DIST_DIR"/*-darwin*.zip; do
            if [ -f "$ZIP_FILE" ]; then
                cp "$ZIP_FILE" "$OUTPUT_DIR/"
                COPIED_FILES+=("$(basename "$ZIP_FILE")")
                echo "      ✓ $(basename "$ZIP_FILE")"
            fi
        done
    fi

    # ===== Linux artifacts =====
    if [ "$BUILD_LINUX" = true ]; then
        print_substep "Copying Linux artifacts..."

        # AppImage files
        for APPIMAGE in "$DIST_DIR"/*.AppImage; do
            if [ -f "$APPIMAGE" ]; then
                cp "$APPIMAGE" "$OUTPUT_DIR/"
                COPIED_FILES+=("$(basename "$APPIMAGE")")
                echo "      ✓ $(basename "$APPIMAGE")"
            fi
        done

        # DEB packages
        for DEB in "$DIST_DIR"/*.deb; do
            if [ -f "$DEB" ]; then
                cp "$DEB" "$OUTPUT_DIR/"
                COPIED_FILES+=("$(basename "$DEB")")
                echo "      ✓ $(basename "$DEB")"
            fi
        done

        # RPM packages
        for RPM in "$DIST_DIR"/*.rpm; do
            if [ -f "$RPM" ]; then
                cp "$RPM" "$OUTPUT_DIR/"
                COPIED_FILES+=("$(basename "$RPM")")
                echo "      ✓ $(basename "$RPM")"
            fi
        done

        # Snap packages
        for SNAP in "$DIST_DIR"/*.snap; do
            if [ -f "$SNAP" ]; then
                cp "$SNAP" "$OUTPUT_DIR/"
                COPIED_FILES+=("$(basename "$SNAP")")
                echo "      ✓ $(basename "$SNAP")"
            fi
        done

        # tar.gz archives
        for TARGZ in "$DIST_DIR"/*-linux*.tar.gz "$DIST_DIR"/*.tar.gz; do
            if [ -f "$TARGZ" ]; then
                cp "$TARGZ" "$OUTPUT_DIR/"
                COPIED_FILES+=("$(basename "$TARGZ")")
                echo "      ✓ $(basename "$TARGZ")"
            fi
        done
    fi

    # ===== Windows artifacts =====
    if [ "$BUILD_WIN" = true ]; then
        print_substep "Copying Windows artifacts..."

        # EXE installers (NSIS)
        for EXE in "$DIST_DIR"/*.exe; do
            if [ -f "$EXE" ]; then
                cp "$EXE" "$OUTPUT_DIR/"
                COPIED_FILES+=("$(basename "$EXE")")
                echo "      ✓ $(basename "$EXE")"
            fi
        done

        # MSI installers
        for MSI in "$DIST_DIR"/*.msi; do
            if [ -f "$MSI" ]; then
                cp "$MSI" "$OUTPUT_DIR/"
                COPIED_FILES+=("$(basename "$MSI")")
                echo "      ✓ $(basename "$MSI")"
            fi
        done

        # Windows ZIP (portable)
        for ZIP in "$DIST_DIR"/*-win*.zip; do
            if [ -f "$ZIP" ]; then
                cp "$ZIP" "$OUTPUT_DIR/"
                COPIED_FILES+=("$(basename "$ZIP")")
                echo "      ✓ $(basename "$ZIP")"
            fi
        done
    fi

    # ===== Common artifacts =====
    print_substep "Copying common artifacts..."

    # Blockmap files (useful for auto-updates)
    for BLOCKMAP in "$DIST_DIR"/*.blockmap; do
        if [ -f "$BLOCKMAP" ]; then
            cp "$BLOCKMAP" "$OUTPUT_DIR/"
            echo "      ✓ $(basename "$BLOCKMAP")"
        fi
    done

    # YAML files (latest.yml, latest-mac.yml, latest-linux.yml)
    for YML in "$DIST_DIR"/latest*.yml; do
        if [ -f "$YML" ]; then
            cp "$YML" "$OUTPUT_DIR/"
            echo "      ✓ $(basename "$YML")"
        fi
    done

    # Print summary
    print_summary "$TAG" "$OUTPUT_DIR"
}

print_summary() {
    local TAG=$1
    local OUTPUT_DIR=$2

    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Build Complete!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "  Version: $TAG"
    echo "  Output:  $OUTPUT_DIR"
    echo ""

    # Show what platforms were built
    echo "  Platforms built:"
    [ "$BUILD_MAC" = true ] && echo "    • macOS"
    [ "$BUILD_LINUX" = true ] && echo "    • Linux"
    [ "$BUILD_WIN" = true ] && echo "    • Windows"
    echo ""

    echo "  Files:"
    ls -lh "$OUTPUT_DIR" 2>/dev/null | tail -n +2 | while read line; do
        echo "    $line"
    done
    echo ""

    # Show installation instructions based on platform
    if [ "$BUILD_MAC" = true ]; then
        DMG_FILE=$(find "$OUTPUT_DIR" -maxdepth 1 -name "*.dmg" -type f | head -1)
        if [ -n "$DMG_FILE" ] && [ -f "$DMG_FILE" ]; then
            echo "  To install on macOS:"
            echo "    open \"$DMG_FILE\""
            echo ""
        fi
    fi

    if [ "$BUILD_LINUX" = true ]; then
        DEB_FILE=$(find "$OUTPUT_DIR" -maxdepth 1 -name "*.deb" -type f | head -1)
        APPIMAGE_FILE=$(find "$OUTPUT_DIR" -maxdepth 1 -name "*.AppImage" -type f | head -1)
        RPM_FILE=$(find "$OUTPUT_DIR" -maxdepth 1 -name "*.rpm" -type f | head -1)

        if [ -n "$DEB_FILE" ] || [ -n "$APPIMAGE_FILE" ] || [ -n "$RPM_FILE" ]; then
            echo "  To install on Linux:"
            [ -n "$DEB_FILE" ] && echo "    sudo dpkg -i \"$DEB_FILE\"  # Debian/Ubuntu"
            [ -n "$RPM_FILE" ] && echo "    sudo rpm -i \"$RPM_FILE\"   # Fedora/RHEL"
            [ -n "$APPIMAGE_FILE" ] && echo "    chmod +x \"$APPIMAGE_FILE\" && \"$APPIMAGE_FILE\"  # AppImage"
            echo ""
        fi
    fi

    if [ "$BUILD_WIN" = true ]; then
        EXE_FILE=$(find "$OUTPUT_DIR" -maxdepth 1 -name "*.exe" -type f | head -1)
        if [ -n "$EXE_FILE" ] && [ -f "$EXE_FILE" ]; then
            echo "  To install on Windows:"
            echo "    Run: $(basename "$EXE_FILE")"
            echo ""
        fi
    fi
}

#-------------------------------------------------------------------------------
# Main Execution
#-------------------------------------------------------------------------------

main() {
    # Detect OS first
    detect_os

    # Parse command line arguments
    parse_args "$@"

    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Beekeeper Studio Fork - Cross-Platform Build Script${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo "  Repository: $PROJECT_DIR"
    echo "  Current OS: $CURRENT_OS"
    echo -n "  Building for:"
    [ "$BUILD_MAC" = true ] && echo -n " macOS"
    [ "$BUILD_LINUX" = true ] && echo -n " Linux"
    [ "$BUILD_WIN" = true ] && echo -n " Windows"
    echo ""

    START_TIME=$(date +%s)

    check_prerequisites
    setup_node
    sync_upstream
    clean_project
    install_dependencies
    build_app
    copy_artifacts

    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    MINUTES=$((DURATION / 60))
    SECONDS=$((DURATION % 60))

    echo -e "  Total build time: ${MINUTES}m ${SECONDS}s"
    echo ""
}

# Run main function
main "$@"
