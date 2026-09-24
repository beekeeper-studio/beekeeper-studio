#!/bin/bash

FILE=/var/lib/scylla/.initialized.nu

if [ ! -f "$FILE" ]; then
  # Create default keyspace for single node cluster
  until cqlsh -f docker-entrypoint.initdb.d/data.cql && touch $FILE; do
    echo "cqlsh: ScyllaDB is unavailable - retry later"
    sleep 2
  done &
fi

exec /docker-entrypoint.py "$@"
