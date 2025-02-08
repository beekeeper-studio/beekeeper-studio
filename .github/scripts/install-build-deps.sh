#! /bin/bash

set -euxo pipefail

sudo apt install -y flatpak flatpak-builder rpm libarchive-tools
flatpak --user remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
