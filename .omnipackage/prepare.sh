#!/usr/bin/env bash

set -xEeuo pipefail

# node-gyp needs a modern python3, but some distros default /usr/bin/python3 to a
# stale interpreter (e.g. openSUSE Leap → 3.6). Point `python3` at the newest
# /usr/bin/python3.NN via /usr/local/bin (higher PATH priority than /usr/bin on
# every supported distro, so the system python3 and distro tools are untouched).
# No-op when the system python3 is already current.
mkdir -p /usr/local/bin
for py in /usr/bin/python3.13 /usr/bin/python3.12 /usr/bin/python3.11 /usr/bin/python3.10 /usr/bin/python3.9; do
  if [ -x "$py" ]; then
    ln -sf "$py" /usr/local/bin/python3
    break
  fi
done

# Some distros default to a C++ compiler too old for the C++20 native modules
# (e.g. os-dns-native); openSUSE Leap 15.6 ships gcc 7. Where a newer versioned
# compiler is installed (via build_dependencies), expose gcc/g++/cc/c++ through
# /usr/local/bin so node-gyp picks it up. No-op when the default is new enough.
for ver in 15 14 13 12 11 10; do
  if [ -x "/usr/bin/g++-$ver" ] && [ -x "/usr/bin/gcc-$ver" ]; then
    ln -sf "/usr/bin/gcc-$ver" /usr/local/bin/gcc
    ln -sf "/usr/bin/gcc-$ver" /usr/local/bin/cc
    ln -sf "/usr/bin/g++-$ver" /usr/local/bin/g++
    ln -sf "/usr/bin/g++-$ver" /usr/local/bin/c++
    break
  fi
done

# nvm provides the pinned Node version (.nvmrc) at build time. /profile is sourced
# by install.sh to pull the nvm shell function into the build step.
export NVM_DIR=/nvm
export PROFILE=/profile

mkdir -p "$NVM_DIR"
touch "$PROFILE"

if nvm --version; then
  exit 0
fi

curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
source "$PROFILE"

nvm --version
