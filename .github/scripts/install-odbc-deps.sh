#! /bin/bash

# ODBC build dependencies for msnodesqlv8 (SQL Server support).
#
# msnodesqlv8 needs sql.h (unixODBC) and msodbcsql.h (Microsoft's driver) to
# compile, and libodbc at load time. Neither ships on the Linux or macOS
# runners, and neither is in the Ubuntu archive or homebrew-core. Windows needs
# nothing: odbc32 and the SQL headers come with the OS and the Windows SDK.
#
# msnodesqlv8 is an optional dependency, so yarn downgrades a failed build to a
# warning and the app ships without SQL Server support. Assert the headers are
# in place here rather than finding out at runtime.

set -euxo pipefail

case "$(uname -s)" in
  Linux)
    MSODBC_HEADER=/opt/microsoft/msodbcsql18/include/msodbcsql.h

    sudo apt-get update
    sudo apt-get install -y curl gnupg unixodbc-dev

    # Some runner images ship the driver already; skip the repo setup there so
    # the Microsoft source is not configured twice.
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
    ;;

  Darwin)
    # The published darwin prebuild links against
    # $(brew --prefix)/opt/unixodbc/lib/libodbc.2.dylib, so unixodbc is needed
    # even when nothing is compiled from source.
    brew list --formula unixodbc >/dev/null 2>&1 || brew install unixodbc

    # msodbcsql.h is not in homebrew-core. Homebrew 6 refuses to load formulae
    # from third-party taps until they are trusted; brew trust is
    # non-interactive. The formula installs the header the build needs into
    # $(brew --prefix)/include/msodbcsql18/, one of the folders binding.gyp
    # searches.
    brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release
    brew trust microsoft/mssql-release
    brew list --formula msodbcsql18 >/dev/null 2>&1 \
      || HOMEBREW_ACCEPT_EULA=Y brew install microsoft/mssql-release/msodbcsql18

    BREW_PREFIX="$(brew --prefix)"
    test -f "$BREW_PREFIX/include/sql.h"
    test -f "$BREW_PREFIX/include/msodbcsql18/msodbcsql.h"
    ;;

  *)
    echo "No ODBC setup needed on $(uname -s)"
    ;;
esac
