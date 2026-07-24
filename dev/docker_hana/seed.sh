#!/bin/bash
# Waits for the HXE tenant to accept SQL connections, then loads seed.sql once.
# Runs inside the saplabs/hanaexpress image, which ships hdbsql.
set -u

HOST=hana
PORT=39041
USER=SYSTEM
PASSWORD=HXEHana1

HDBSQL=/usr/sap/hdbclient/hdbsql
if [ ! -x "$HDBSQL" ]; then
  HDBSQL=$(ls /usr/sap/*/HDB*/exe/hdbsql 2>/dev/null | head -1)
fi
if [ -z "$HDBSQL" ]; then
  echo "hdbsql not found in image" >&2
  exit 1
fi

echo "Waiting for HANA at $HOST:$PORT (first boot takes several minutes)..."
for _ in $(seq 1 120); do
  if "$HDBSQL" -n "$HOST:$PORT" -u "$USER" -p "$PASSWORD" -x "SELECT 1 FROM DUMMY" >/dev/null 2>&1; then
    break
  fi
  sleep 10
done

if ! "$HDBSQL" -n "$HOST:$PORT" -u "$USER" -p "$PASSWORD" -x "SELECT 1 FROM DUMMY" >/dev/null 2>&1; then
  echo "HANA did not become ready in time" >&2
  exit 1
fi

if "$HDBSQL" -n "$HOST:$PORT" -u "$USER" -p "$PASSWORD" -x \
  "SELECT SCHEMA_NAME FROM SYS.SCHEMAS WHERE SCHEMA_NAME = 'sakila'" | grep -q sakila; then
  echo "Seed schema already present, nothing to do"
  exit 0
fi

echo "Loading seed data..."
"$HDBSQL" -n "$HOST:$PORT" -u "$USER" -p "$PASSWORD" -I /docker_init/seed.sql
echo "Seed complete"
