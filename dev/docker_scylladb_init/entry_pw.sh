#!/bin/bash

FILE=/var/lib/scylla/.initialized.nu

if [ ! -f "$FILE" ]; then
  # Create default keyspace for single node cluster
  until cqlsh localhost -f docker-entrypoint.initdb.d/data.cql && touch $FILE; do
    echo "cqlsh: ScyllaDB is unavailable - retry later"
    sleep 2
  done &
  echo "authenticator: PasswordAuthenticator" >> /etc/scylla/scylla.yaml
fi

exec /docker-entrypoint.py "$@"
