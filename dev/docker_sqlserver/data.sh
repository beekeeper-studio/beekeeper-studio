#! /bin/bash

set -euxo pipefail

FILE=/var/opt/mssql/.initialized

if test -f "$FILE"; then
  echo "database already initialized"
else
  sleep 30s
  /opt/mssql-tools/bin/sqlcmd -S localhost -i /docker_init/1_schema.sql -U sa -P "$SA_PASSWORD"
  /opt/mssql-tools/bin/sqlcmd -S localhost -i /docker_init/2_data.sql -U sa -P "$SA_PASSWORD"
  touch "$FILE"
fi



