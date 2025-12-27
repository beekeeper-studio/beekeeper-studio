#!/bin/bash

#===============================================================================
# Beekeeper Studio Fork - Build Script for Mac (Apple Silicon)
#===============================================================================
# This script builds the Beekeeper Studio fork and copies the installers
# to ~/Downloads/beekeeper-releases/{tag}
#
# Prerequisites (one-time setup):
#   1. Install nvm:    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
#   2. Install Node:   nvm install 20
#   3. Install Yarn:   npm install -g yarn
#   4. Install Python setuptools: brew install python-setuptools
#
# Usage:
#   ./build-beekeeper.sh                    # Build current version
#   ./build-beekeeper.sh --sync             # Sync with upstream first, then build
#   ./build-beekeeper.sh --clean            # Clean node_modules before build
#   ./build-beekeeper.sh --sync --clean     # Full clean build with upstream sync
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
NC='\033[0m' # No Color

# Parse arguments
SYNC_UPSTREAM=false
CLEAN_BUILD=false

for arg in "$@"; do
    case $arg in
        --sync)
            SYNC_UPSTREAM=true
            ;;
        --clean)
            CLEAN_BUILD=true
            ;;
        --help|-h)
            echo "Usage: $0 [--sync] [--clean]"
            echo ""
            echo "Options:"
            echo "  --sync   Sync with upstream repository before building"
            echo "  --clean  Remove node_modules and reinstall dependencies"
            echo ""
            echo "Examples:"
            echo "  $0                    # Basic build"
            echo "  $0 --sync             # Sync with upstream, then build"
            echo "  $0 --clean            # Clean build"
            echo "  $0 --sync --clean     # Full clean build with upstream sync"
            exit 0
            ;;
    esac
done

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------

print_step() {
    echo -e "\n${BLUE}==>${NC} ${GREEN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}Warning:${NC} $1"
}

print_error() {
    echo -e "${RED}Error:${NC} $1"
}

check_prerequisites() {
    print_step "Checking prerequisites..."

    # Check if nvm is installed
    export NVM_DIR="$HOME/.nvm"
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        source "$NVM_DIR/nvm.sh"
    else
        print_error "nvm is not installed. Please install it first:"
        echo "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
        exit 1
    fi

    # Check if yarn is installed
    if ! command -v yarn &> /dev/null; then
        print_error "yarn is not installed. Please install it first:"
        echo "  npm install -g yarn"
        exit 1
    fi

    # Check if we're in a git repository
    if [ ! -d "$PROJECT_DIR/.git" ]; then
        print_error "This script must be run from within the git repository"
        exit 1
    fi

    # Check if package.json exists
    if [ ! -f "$PROJECT_DIR/package.json" ]; then
        print_error "package.json not found. Are you in the correct directory?"
        exit 1
    fi

    echo "  ✓ All prerequisites met"
}

setup_node() {
    print_step "Setting up Node.js $REQUIRED_NODE_VERSION..."

    # Load nvm
    export NVM_DIR="$HOME/.nvm"
    source "$NVM_DIR/nvm.sh"

    # Install and use Node 20
    nvm install $REQUIRED_NODE_VERSION > /dev/null 2>&1
    nvm use $REQUIRED_NODE_VERSION > /dev/null 2>&1

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
    yarn run electron:build

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

    # Find and copy DMG file
    DMG_FILE=$(find "$DIST_DIR" -maxdepth 1 -name "*.dmg" -type f | head -1)
    if [ -n "$DMG_FILE" ] && [ -f "$DMG_FILE" ]; then
        cp "$DMG_FILE" "$OUTPUT_DIR/"
        echo "  ✓ Copied: $(basename "$DMG_FILE")"
    else
        print_warning "No DMG file found"
    fi

    # Find and copy ZIP file
    ZIP_FILE=$(find "$DIST_DIR" -maxdepth 1 -name "*-mac.zip" -type f | head -1)
    if [ -n "$ZIP_FILE" ] && [ -f "$ZIP_FILE" ]; then
        cp "$ZIP_FILE" "$OUTPUT_DIR/"
        echo "  ✓ Copied: $(basename "$ZIP_FILE")"
    else
        print_warning "No ZIP file found"
    fi

    # Copy blockmap files (useful for auto-updates)
    for BLOCKMAP in "$DIST_DIR"/*.blockmap; do
        if [ -f "$BLOCKMAP" ]; then
            cp "$BLOCKMAP" "$OUTPUT_DIR/"
            echo "  ✓ Copied: $(basename "$BLOCKMAP")"
        fi
    done

    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Build Complete!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "  Version: $TAG"
    echo "  Output:  $OUTPUT_DIR"
    echo ""
    echo "  Files:"
    ls -lh "$OUTPUT_DIR" 2>/dev/null | tail -n +2 | while read line; do
        echo "    $line"
    done
    echo ""
    
    if [ -n "$DMG_FILE" ] && [ -f "$DMG_FILE" ]; then
        echo "  To install, run:"
        echo "    open \"$OUTPUT_DIR/$(basename "$DMG_FILE")\""
        echo ""
    fi
}

#-------------------------------------------------------------------------------
# Main Execution
#-------------------------------------------------------------------------------

main() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Beekeeper Studio Fork - Build Script${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo "  Repository: $PROJECT_DIR"

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
main