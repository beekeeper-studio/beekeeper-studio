#! /bin/bash

# ODBC build deps for msnodesqlv8

set -euxo pipefail

brew list --formula unixodbc >/dev/null 2>&1 || brew install unixodbc

# ref: https://learn.microsoft.com/en-us/sql/connect/odbc/linux-mac/install-microsoft-odbc-driver-sql-server-macos?view=sql-server-ver15
brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release
brew trust microsoft/mssql-release
brew list --formula msodbcsql18 >/dev/null 2>&1 \
  || HOMEBREW_ACCEPT_EULA=Y brew install microsoft/mssql-release/msodbcsql18

BREW_PREFIX="$(brew --prefix)"
test -f "$BREW_PREFIX/include/sql.h"
test -f "$BREW_PREFIX/include/msodbcsql18/msodbcsql.h"
