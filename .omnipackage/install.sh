#!/usr/bin/env bash

source /profile

set -xEeuo pipefail

BUILDROOT=$1
NAME=$2

# Node toolchain. nvm install reads .nvmrc for the pinned version; the root
# packageManager field pins yarn 1.22.22, which corepack activates.
nvm install
corepack enable
nvm use
node -v

# husky's git-hook install (root postinstall) fails without a .git dir, which is
# stripped from the staged source tree (ignore_source_files).
export HUSKY=0

# Workspace install. apps/studio's postinstall runs `electron-builder
# install-app-deps`, rebuilding the native modules (better-sqlite3, oracledb)
# against Electron's ABI rather than the system Node ABI.
yarn install

# Build the UI-kit lib first, then the studio main + renderer bundles.
yarn lib:build
yarn workspace beekeeper-studio build

# Produce only an unpacked Electron tree. `--linux dir` overrides the config's
# target array, skipping electron-builder's snap/deb/rpm/appimage/flatpak/pacman
# wrappers (omnipackage owns packaging). The afterPack hook still runs: it renames
# the binary to beekeeper-studio-bin and swaps in the launcher wrapper as
# beekeeper-studio (which execs ...-bin --no-sandbox $USER_FLAGS).
(
  cd apps/studio
  yarn electron-builder --config ./electron-builder-config.js --linux dir --publish never
)

# Stage the unpacked tree under /opt/<NAME>.
mkdir -p "$BUILDROOT/opt/$NAME"
cp -a apps/studio/dist_electron/linux-unpacked/. "$BUILDROOT/opt/$NAME/"

# Prune prebuilt native binaries for other OSes/arches. Several deps bundle a
# binary per platform (oracledb ships darwin/win32/linux-arm64 .node files; libsql
# ships a musl variant). None are loaded on this build's glibc-Linux+arch, and they
# cause real problems: the musl binary needs an unversioned `libc.so` no glibc
# package provides, and the foreign-arch ELFs break rpm's strip pass. Keep only
# this build's linux + arch. (kerberos/src/win32 is source, not a binary — skipped.)
UNPACK="$BUILDROOT/opt/$NAME/resources/app.asar.unpacked/node_modules"
case "$(uname -m)" in
  x86_64)  drop_arch="arm64" ;;
  aarch64) drop_arch="x64" ;;
  *)       drop_arch="" ;;
esac
if [ -d "$UNPACK" ]; then
  find "$UNPACK" -depth ! -path '*/src/*' \
       \( -iname '*darwin*' -o -iname '*win32*' -o -iname '*-musl*' \) -exec rm -rf {} +
  [ -n "$drop_arch" ] && find "$UNPACK" -depth -iname "*linux-${drop_arch}*" -exec rm -rf {} +
fi

# User-facing launcher. The launcher script resolves its own directory through
# this symlink, so /usr/bin/<NAME> -> /opt/<NAME>/<NAME> just works.
mkdir -p "$BUILDROOT/usr/bin"
ln -sf "/opt/$NAME/$NAME" "$BUILDROOT/usr/bin/$NAME"

# Desktop entry. Exec goes through /usr/bin/<NAME> (the launcher). MimeType covers
# the SQLite/DuckDB file associations and the database URL schemes the app handles.
mkdir -p "$BUILDROOT/usr/share/applications"
cat > "$BUILDROOT/usr/share/applications/$NAME.desktop" <<EOF
[Desktop Entry]
Name=Beekeeper Studio
GenericName=SQL Editor
Comment=Modern and easy to use SQL client and database manager
Exec=/usr/bin/$NAME %U
Icon=$NAME
Type=Application
StartupNotify=true
StartupWMClass=beekeeper-studio
Categories=Development;Database;
MimeType=application/vnd.sqlite3;application/vnd.duckdb;x-scheme-handler/mysql;x-scheme-handler/mariadb;x-scheme-handler/postgresql;x-scheme-handler/postgres;x-scheme-handler/redis;x-scheme-handler/rediss;x-scheme-handler/sqlserver;x-scheme-handler/mssql;x-scheme-handler/redshift;x-scheme-handler/cockroachdb;
EOF

# Icons (sizes shipped in apps/studio/public/icons/png/). Keep this list in lockstep
# with %files in the rpm spec.
for size in 16 24 32 48 64 96 128 256 512 1024; do
  mkdir -p "$BUILDROOT/usr/share/icons/hicolor/${size}x${size}/apps"
  cp "apps/studio/public/icons/png/${size}x${size}.png" \
     "$BUILDROOT/usr/share/icons/hicolor/${size}x${size}/apps/$NAME.png"
done
