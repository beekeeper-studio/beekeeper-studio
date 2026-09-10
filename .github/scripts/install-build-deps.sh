#! /bin/bash

set -euxo pipefail

sudo apt update
# unixodbc-dev supplies sql.h, needed to build msnodesqlv8 from source.
# linux-arm64 has no prebuilt binary, so without it the optional dependency
# fails silently and the build ships without SQL Server support.
sudo apt install -y flatpak flatpak-builder rpm libarchive-tools unixodbc-dev
flatpak --user remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
