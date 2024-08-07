#!/bin/bash

set -euxo pipefail

echo "Starting to run scripts..."
sqlplus -s beekeeper/password@//localhost/BEEKEEPER @"/docker-entrypoint-initdb.d/scripts/1.sql"

echo "Finished running scripts"
