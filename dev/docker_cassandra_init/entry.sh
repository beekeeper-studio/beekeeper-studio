#!/bin/bash

FILE=/var/lib/cassandra/.initialized.nu

if [ ! -f "$FILE" ]; then
  # Create default keyspace for single node cluster
  until cqlsh localhost -f docker-entrypoint.initdb.d/data.cql && touch $FILE; do
    echo "cqlsh: Cassandra is unavailable - retry later"
    sleep 2
  done &
fi

exec /usr/local/bin/docker-entrypoint.sh "$@"
