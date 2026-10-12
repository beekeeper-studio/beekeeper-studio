#! /bin/bash

# ODBC build deps for msnodesqlv8

set -euxo pipefail

MSODBC_HEADER=/opt/microsoft/msodbcsql18/include/msodbcsql.h

sudo apt-get update
sudo apt-get install -y curl gnupg unixodbc-dev

if [ ! -f "$MSODBC_HEADER" ]; then
  # shellcheck disable=SC1091
  . /etc/os-release

  curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
    | sudo gpg --dearmor --yes -o /usr/share/keyrings/microsoft-prod.gpg

  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/ubuntu/${VERSION_ID}/prod ${VERSION_CODENAME} main" \
    | sudo tee /etc/apt/sources.list.d/mssql-release.list

  sudo apt-get update
  sudo ACCEPT_EULA=Y DEBIAN_FRONTEND=noninteractive apt-get install -y msodbcsql18
fi

test -f /usr/include/sql.h
test -f "$MSODBC_HEADER"
