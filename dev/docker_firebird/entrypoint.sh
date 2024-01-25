#! /bin/bash

set -euxo pipefail

FILE=/firebird/data/sakila.fdb

if test -f "$FILE"; then
  echo "database already initialized"
else
  sleep 30s
  echo "create database 'sakila.fdb';" | /usr/local/firebird/bin/isql -u sysdba -p masterkey employee
  /usr/local/firebird/bin/isql -u sysdba -p masterkey sakila.fdb -i /docker_init/sakila-schema.sql
  /usr/local/firebird/bin/isql -u sysdba -p masterkey sakila.fdb -i /docker_init/sakila-data.sql
  echo "database initialized!"
fi
