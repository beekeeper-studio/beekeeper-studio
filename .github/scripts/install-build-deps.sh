#! /bin/bash

set -euxo pipefail

sudo apt update
sudo apt install -y flatpak flatpak-builder rpm libarchive-tools unixodbc-dev
flatpak --user remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
